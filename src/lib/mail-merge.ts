import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session.functions";
import { mapDocument } from "@/lib/mappers";
import { companyForPreview } from "@/lib/company-defaults";
import { isAdmin } from "@/lib/roles";
import type { MailMergeCampaign } from "@/store/types";
import { clientLetterRecipientLines, formatClientBp } from "@/lib/client-address";
import { staffDisplayName } from "@/lib/notify-document-status";

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
  sigle?: string | null;
  contactName: string;
  representativeTitle?: string | null;
  address: string;
  bp?: string | null;
  city: string;
  country: string;
  nif?: string | null;
  rccm?: string | null;
  activity?: string | null;
}): Record<string, string> {
  const title = client.representativeTitle?.trim() ?? "";
  return {
    nom: client.name,
    sigle: client.sigle?.trim() ?? "",
    contact: client.contactName || client.name,
    qualite: title,
    adresse: client.address,
    bp: formatClientBp(client.bp),
    ville: client.city,
    pays: client.country,
    nif: client.nif?.trim() ?? "",
    rccm: client.rccm?.trim() ?? "",
    activite: client.activity?.trim() ?? "",
  };
}

const guestRecipientSchema = z.object({
  name: z.string().min(1, "Dénomination requise"),
  sigle: z.string().default(""),
  contactName: z.string().default(""),
  representativeTitle: z.string().default(""),
  email: z.string().email("Email invalide"),
  phone: z.string().default(""),
  address: z.string().default(""),
  bp: z.string().default(""),
  city: z.string().default(""),
  country: z.string().default("Gabon"),
  nif: z.string().default(""),
  rccm: z.string().default(""),
  activity: z.string().default(""),
});

const createCampaignSchema = z
  .object({
    clientIds: z.array(z.string()).default([]),
    guests: z.array(guestRecipientSchema).default([]),
    subject: z.string().min(1, "L'objet est requis"),
    salutation: z.string().default(""),
    body: z.string().min(1, "Le corps est requis"),
    closing: z.string().default(""),
    signatoryTitle: z.string().default("Le Gérant"),
    issueDate: z.string().optional(),
  })
  .refine((d) => d.clientIds.length + d.guests.length >= 1, {
    message: "Sélectionnez au moins un destinataire",
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
    signatureRequestedAt?: Date | null;
    signatureRequestedById?: string | null;
    signatureRejectedAt?: Date | null;
    signatureRejectNote?: string | null;
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
    signatureRequestedAt: row.signatureRequestedAt?.toISOString() ?? null,
    signatureRequestedById: row.signatureRequestedById ?? null,
    signatureRejectedAt: row.signatureRejectedAt?.toISOString() ?? null,
    signatureRejectNote: row.signatureRejectNote ?? null,
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

async function campaignInclude(id: string) {
  return prisma.mailMergeCampaign.findUniqueOrThrow({
    where: { id },
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
}

async function notifyMailMergeAudience(args: {
  actorStaffId: string;
  cabinet: "conseil" | "expertise_fiscale";
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "danger";
  alsoStaffIds?: string[];
}) {
  const admins = await prisma.staffMember.findMany({
    where: {
      id: { not: args.actorStaffId },
      OR: [
        { role: "super_admin" },
        { role: "admin", cabinet: args.cabinet },
      ],
    },
    select: { id: true },
  });
  const ids = new Set(admins.map((a) => a.id));
  for (const id of args.alsoStaffIds ?? []) {
    if (id !== args.actorStaffId) ids.add(id);
  }
  if (ids.size === 0) return;
  await prisma.notification.createMany({
    data: [...ids].map((staffId) => ({
      staffId,
      cabinet: args.cabinet,
      title: args.title,
      body: args.body,
      type: args.type,
    })),
  });
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

    const clients = data.clientIds.length
      ? await prisma.client.findMany({
          where: {
            id: { in: data.clientIds },
            cabinet: activeCabinet,
            isTransient: false,
          },
        })
      : [];

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

    const recipients: Array<{
      id: string;
      name: string;
      sigle?: string | null;
      contactName: string;
      representativeTitle?: string | null;
      address: string;
      bp?: string | null;
      city: string;
      country: string;
      nif?: string | null;
      rccm?: string | null;
      activity?: string | null;
    }> = [...clients];

    for (const g of data.guests) {
      const guest = await prisma.client.create({
        data: {
          cabinet: activeCabinet,
          name: g.name.trim(),
          sigle: g.sigle?.trim() ?? "",
          legalForm: "—",
          shareCapital: "",
          nif: g.nif?.trim() ?? "",
          niu: "",
          rccm: g.rccm?.trim() ?? "",
          cnss: "",
          cnamgs: "",
          activity: g.activity?.trim() ?? "",
          activityDetail: "",
          contactName: g.contactName.trim() || g.name.trim(),
          representativeTitle: g.representativeTitle?.trim() ?? "",
          email: g.email.trim(),
          phone: g.phone?.trim() ?? "",
          address: g.address?.trim() ?? "",
          bp: g.bp?.trim() ?? "",
          city: g.city?.trim() ?? "",
          country: g.country?.trim() || "Gabon",
          isTransient: true,
          createdById: staff.id,
        },
      });
      recipients.push(guest);
    }

    if (recipients.length === 0) {
      await prisma.mailMergeCampaign.delete({ where: { id: campaign.id } });
      throw new Error("Aucun destinataire trouvé");
    }

    let nextNumber = await nextLetterNumber(activeCabinet);

    for (const client of recipients) {
      const vars = clientVars(client);
      const number = nextNumber;
      const seq = Number.parseInt(number.split("-").pop() ?? "1", 10);
      nextNumber = `LT-${new Date().getFullYear()}-${String(seq + 1).padStart(3, "0")}`;

      const recipientOverride = clientLetterRecipientLines(client).join("\n");

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

    return mapCampaign(await campaignInclude(campaign.id));
  });

/** Membre (ou créateur) demande la signature de la campagne. */
export const requestMailMergeSignature = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff, activeCabinet } = session;

    const campaign = await prisma.mailMergeCampaign.findFirst({
      where: { id: data.id, cabinet: activeCabinet },
      include: { _count: { select: { documents: true } } },
    });
    if (!campaign) throw new Error("Campagne introuvable");
    if (campaign.status === "signed" || campaign.status === "sent") {
      throw new Error("Cette campagne est déjà signée");
    }
    if (campaign.status === "pending_signature") {
      return mapCampaign(await campaignInclude(campaign.id));
    }

    await prisma.mailMergeCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "pending_signature",
        signatureRequestedAt: new Date(),
        signatureRequestedById: staff.id,
        signatureRejectedAt: null,
        signatureRejectNote: null,
      },
    });

    await notifyMailMergeAudience({
      actorStaffId: staff.id,
      cabinet: activeCabinet,
      title: "Publipostage — signature demandée",
      body: `${staffDisplayName(staff)} demande votre signature sur le publipostage « ${campaign.subject} » (${campaign._count.documents} courriel(s)).`,
      type: "warning",
    });

    return mapCampaign(await campaignInclude(campaign.id));
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

    const companyRow = await prisma.company.findUnique({
      where: { cabinet: activeCabinet },
    });
    const company = companyForPreview(companyRow, activeCabinet);
    if (!company.managerName?.trim()) {
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
          signatureRejectedAt: null,
          signatureRejectNote: null,
        },
      }),
      prisma.document.updateMany({
        where: { mailMergeCampaignId: campaign.id },
        data: { status: "signed" },
      }),
    ]);

    await notifyMailMergeAudience({
      actorStaffId: staff.id,
      cabinet: activeCabinet,
      title: "Publipostage signé",
      body: `${staffDisplayName(staff)} a signé le publipostage « ${campaign.subject} ». Vous pouvez procéder à l’envoi.`,
      type: "success",
      alsoStaffIds: [
        campaign.createdById,
        campaign.signatureRequestedById ?? "",
      ].filter(Boolean),
    });

    return mapCampaign(await campaignInclude(campaign.id));
  });

export const rejectMailMergeSignature = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      note: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff, activeCabinet } = session;
    if (!isAdmin(staff.role)) {
      throw new Error("Accès réservé aux administrateurs");
    }

    const campaign = await prisma.mailMergeCampaign.findFirst({
      where: { id: data.id, cabinet: activeCabinet },
    });
    if (!campaign) throw new Error("Campagne introuvable");
    if (campaign.status !== "pending_signature") {
      throw new Error("Aucune demande de signature en attente");
    }

    await prisma.mailMergeCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "draft",
        signatureRejectedAt: new Date(),
        signatureRejectNote: data.note?.trim() || null,
        signatureRequestedAt: null,
        signatureRequestedById: null,
      },
    });

    await notifyMailMergeAudience({
      actorStaffId: staff.id,
      cabinet: activeCabinet,
      title: "Publipostage — signature refusée",
      body: `${staffDisplayName(staff)} a refusé de signer « ${campaign.subject} »${
        data.note?.trim() ? ` : ${data.note.trim()}` : "."
      }`,
      type: "danger",
      alsoStaffIds: [
        campaign.createdById,
        campaign.signatureRequestedById ?? "",
      ].filter(Boolean),
    });

    return mapCampaign(await campaignInclude(campaign.id));
  });

/** Marque la campagne comme envoyée après envoi réussi des lettres (côté client). */
export const markMailMergeCampaignSent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
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
