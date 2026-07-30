import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session.functions";
import { mapDocument } from "@/lib/mappers";
import { isAdmin } from "@/lib/roles";
import type { MailMergeCampaign } from "@/store/types";

async function requireSession() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  return session;
}

function interpolate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

function clientVars(client: {
  name: string;
  contactName: string;
  address: string;
  city: string;
  country: string;
}): Record<string, string> {
  return {
    nom: client.name,
    contact: client.contactName || client.name,
    adresse: client.address,
    ville: client.city,
    pays: client.country,
  };
}

const createCampaignSchema = z.object({
  clientIds: z.array(z.string()).min(1, "Sélectionnez au moins un destinataire"),
  subject: z.string().min(1, "L'objet est requis"),
  salutation: z.string().default(""),
  body: z.string().min(1, "Le corps est requis"),
  closing: z.string().default(""),
  signatoryTitle: z.string().default("Le Gérant"),
  issueDate: z.string().optional(),
});

function mapCampaign(
  row: {
    id: string;
    cabinet: MailMergeCampaign["cabinet"];
    createdById: string;
    status: MailMergeCampaign["status"];
    subject: string;
    salutation: string;
    body: string;
    closing: string;
    signatoryTitle: string;
    issueDate: Date;
    signedAt: Date | null;
    signedById: string | null;
    sentAt: Date | null;
    createdAt: Date;
    _count?: { documents: number };
    documents?: Parameters<typeof mapDocument>[0][];
  },
): MailMergeCampaign {
  return {
    id: row.id,
    cabinet: row.cabinet,
    createdById: row.createdById,
    status: row.status,
    subject: row.subject,
    salutation: row.salutation,
    body: row.body,
    closing: row.closing,
    signatoryTitle: row.signatoryTitle,
    issueDate: row.issueDate.toISOString().slice(0, 10),
    signedAt: row.signedAt?.toISOString() ?? null,
    signedById: row.signedById,
    sentAt: row.sentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    documentCount: row._count?.documents ?? row.documents?.length ?? 0,
    documents: row.documents?.map(mapDocument),
  };
}

async function nextLetterNumber(cabinet: "conseil" | "expertise_fiscale") {
  const year = new Date().getFullYear();
  const prefix = `LT-${year}-`;
  const last = await prisma.document.findFirst({
    where: { cabinet, type: "letter", number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  let seq = 1;
  if (last?.number) {
    const part = last.number.slice(prefix.length);
    const n = Number.parseInt(part, 10);
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

export const listMailMergeCampaigns = createServerFn({ method: "GET" }).handler(
  async () => {
    const { activeCabinet } = await requireSession();
    const rows = await prisma.mailMergeCampaign.findMany({
      where: { cabinet: activeCabinet },
      include: { _count: { select: { documents: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map(mapCampaign);
  },
);

export const getMailMergeCampaign = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const row = await prisma.mailMergeCampaign.findFirst({
      where: { id: data.id, cabinet: session.activeCabinet },
      include: {
        _count: { select: { documents: true } },
        documents: {
          include: {
            lines: { orderBy: { position: "asc" as const } },
            createdBy: true,
            client: true,
          },
          orderBy: { number: "asc" },
        },
      },
    });
    if (!row) throw new Error("Campagne introuvable");
    return mapCampaign(row);
  });

export const createMailMergeCampaign = createServerFn({ method: "POST" })
  .validator(createCampaignSchema)
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff, activeCabinet } = session;

    const clients = await prisma.client.findMany({
      where: { id: { in: data.clientIds }, cabinet: activeCabinet },
    });
    if (clients.length === 0) throw new Error("Aucun client trouvé");

    const issueDate = data.issueDate
      ? new Date(`${data.issueDate}T12:00:00.000Z`)
      : new Date();
    const dueDate = issueDate;

    const campaign = await prisma.mailMergeCampaign.create({
      data: {
        cabinet: activeCabinet,
        createdById: staff.id,
        status: "draft",
        subject: data.subject.trim(),
        salutation: data.salutation.trim(),
        body: data.body.trim(),
        closing: data.closing.trim(),
        signatoryTitle: data.signatoryTitle.trim() || "Le Gérant",
        issueDate,
      },
    });

    let nextNumber = await nextLetterNumber(activeCabinet);

    for (const client of clients) {
      const vars = clientVars(client);
      const number = nextNumber;
      const seq = Number.parseInt(number.split("-").pop() ?? "1", 10);
      nextNumber = `LT-${new Date().getFullYear()}-${String(seq + 1).padStart(3, "0")}`;

      const recipientOverride = [
        client.contactName ? "À" : "",
        client.contactName || "",
        client.name ? `De ${client.name}` : "",
        [client.address, client.city, client.country].filter(Boolean).join(" — "),
      ]
        .filter(Boolean)
        .join("\n");

      await prisma.document.create({
        data: {
          cabinet: activeCabinet,
          type: "letter",
          number,
          clientId: client.id,
          createdById: staff.id,
          status: "draft",
          issueDate,
          dueDate,
          subtotal: 0,
          tps: 0,
          css: 0,
          vat: 0,
          total: 0,
          currency: "XAF",
          subject: interpolate(data.subject, vars),
          salutation: interpolate(data.salutation, vars),
          body: interpolate(data.body, vars),
          closing: interpolate(data.closing, vars),
          signatoryTitle: data.signatoryTitle.trim() || "Le Gérant",
          recipientOverride,
          mailMergeCampaignId: campaign.id,
        },
      });
    }

    const full = await prisma.mailMergeCampaign.findUniqueOrThrow({
      where: { id: campaign.id },
      include: {
        _count: { select: { documents: true } },
        documents: {
          include: {
            lines: { orderBy: { position: "asc" as const } },
            createdBy: true,
            client: true,
          },
          orderBy: { number: "asc" },
        },
      },
    });
    return mapCampaign(full);
  });

export const signMailMergeCampaign = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff, activeCabinet } = session;
    if (!isAdmin(staff.role)) {
      throw new Error("Seuls les administrateurs peuvent signer les courriers");
    }

    const campaign = await prisma.mailMergeCampaign.findFirst({
      where: { id: data.id, cabinet: activeCabinet },
    });
    if (!campaign) throw new Error("Campagne introuvable");
    if (campaign.status === "sent") {
      throw new Error("Cette campagne a déjà été envoyée");
    }
    if (campaign.status === "signed") {
      throw new Error("Cette campagne est déjà signée");
    }

    const company = await prisma.company.findUnique({
      where: { cabinet: activeCabinet },
    });
    if (!company?.managerName?.trim()) {
      throw new Error(
        "Configurez le nom du gérant dans les paramètres du cabinet avant de signer.",
      );
    }

    await prisma.$transaction([
      prisma.mailMergeCampaign.update({
        where: { id: campaign.id },
        data: {
          status: "signed",
          signedAt: new Date(),
          signedById: staff.id,
        },
      }),
      prisma.document.updateMany({
        where: { mailMergeCampaignId: campaign.id },
        data: { status: "signed" },
      }),
    ]);

    const full = await prisma.mailMergeCampaign.findUniqueOrThrow({
      where: { id: campaign.id },
      include: {
        _count: { select: { documents: true } },
        documents: {
          include: {
            lines: { orderBy: { position: "asc" as const } },
            createdBy: true,
            client: true,
          },
          orderBy: { number: "asc" },
        },
      },
    });
    return mapCampaign(full);
  });

/** Marque la campagne comme envoyée après envoi réussi des lettres (côté client). */
export const markMailMergeCampaignSent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      /** IDs de documents effectivement envoyés. */
      sentDocumentIds: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff, activeCabinet } = session;
    if (!isAdmin(staff.role)) {
      throw new Error("Seuls les administrateurs peuvent envoyer les courriers");
    }

    const campaign = await prisma.mailMergeCampaign.findFirst({
      where: { id: data.id, cabinet: activeCabinet },
    });
    if (!campaign) throw new Error("Campagne introuvable");
    if (campaign.status !== "signed" && campaign.status !== "sent") {
      throw new Error("La campagne doit être signée avant l'envoi");
    }

    if (data.sentDocumentIds.length > 0) {
      await prisma.document.updateMany({
        where: {
          mailMergeCampaignId: campaign.id,
          id: { in: data.sentDocumentIds },
        },
        data: { status: "sent" },
      });
    }

    const pending = await prisma.document.count({
      where: {
        mailMergeCampaignId: campaign.id,
        status: { not: "sent" },
      },
    });

    const full = await prisma.mailMergeCampaign.update({
      where: { id: campaign.id },
      data: {
        status: pending === 0 ? "sent" : "signed",
        sentAt: pending === 0 ? new Date() : campaign.sentAt,
      },
      include: {
        _count: { select: { documents: true } },
        documents: {
          include: {
            lines: { orderBy: { position: "asc" as const } },
            createdBy: true,
            client: true,
          },
          orderBy: { number: "asc" },
        },
      },
    });
    return mapCampaign(full);
  });
