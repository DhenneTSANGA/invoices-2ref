import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Cabinet, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session.functions";
import { isAdmin } from "@/lib/roles";
import { bareEmail, escapeHtml, requireResendApiKey, resolveCabinetMailAddresses, resolveManagerCc, resendErrorMessage } from "@/lib/email";
import { htmlToPreview, logOutboundMail, mapMailRow, type MailListItem } from "@/lib/mail-log";
import { loadDocumentPoles } from "@/lib/client-pole-db";
import { memberCanSeePole } from "@/lib/staff-pole";
import type { StaffMember } from "@/store/types";
import { companyForPreview } from "@/lib/company-defaults";
import { getResend } from "@/lib/resend";

async function requireSession() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  return session;
}

async function filterMailsForMember<T extends { documentId?: string | null }>(
  staff: StaffMember,
  rows: T[],
): Promise<T[]> {
  const ids = rows
    .map((r) => r.documentId)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return rows;
  const poles = await loadDocumentPoles(ids);
  return rows.filter(
    (r) => !r.documentId || memberCanSeePole(staff, poles.get(r.documentId)),
  );
}

function resendApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY manquante");
  return key;
}

async function resendFetch<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.resend.com${path}`, {
    headers: {
      Authorization: `Bearer ${resendApiKey()}`,
      "Content-Type": "application/json",
    },
  });
  const json = (await res.json()) as T & { message?: string; name?: string };
  if (!res.ok) {
    throw new Error(
      (json as { message?: string }).message ||
        `Resend HTTP ${res.status}`,
    );
  }
  return json;
}

type ResendReceivedList = {
  data?: Array<{
    id: string;
    to?: string[] | string | null;
    from?: string | null;
    subject?: string | null;
    created_at?: string;
  }>;
};

type ResendReceivedDetail = {
  id: string;
  to?: string[] | string | null;
  from?: string | null;
  subject?: string | null;
  created_at?: string;
  html?: string | null;
  text?: string | null;
};

function asAddressList(value: string[] | string | null | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value.join(", ") : value;
}

const APP_MAIL_DOMAIN = "2r-hub.com";

/** Adresses From / Reply-To de l’app (env + fiches cabinets). */
async function appMailAddresses(): Promise<Set<string>> {
  const set = new Set<string>();
  const add = (raw?: string | null) => {
    const email = bareEmail(raw ?? "").toLowerCase();
    if (email.includes("@")) set.add(email);
  };
  add(process.env.RESEND_REPLY_TO);
  add(process.env.RESEND_FROM_EMAIL);
  add("2ref@2r-hub.com");
  add("2rconseil@2r-hub.com");

  const companies = await prisma.company.findMany({
    select: { mailFromEmail: true, mailReplyTo: true, email: true },
  });
  for (const c of companies) {
    add(c.mailReplyTo);
    add(c.mailFromEmail);
  }
  return set;
}

/** Déduit le cabinet à partir des adresses destinataires (boîtes From / Reply-To). */
async function resolveCabinetFromToEmail(
  toEmail: string,
): Promise<Cabinet | null> {
  const emails = extractEmails(toEmail);
  if (emails.length === 0) return null;

  const companies = await prisma.company.findMany({
    select: {
      cabinet: true,
      mailFromEmail: true,
      mailReplyTo: true,
      email: true,
    },
  });

  for (const c of companies) {
    const addrs = [c.mailReplyTo, c.mailFromEmail, c.email]
      .map((a) => bareEmail(a ?? "").toLowerCase())
      .filter((e) => e.includes("@"));
    if (emails.some((e) => addrs.includes(e))) return c.cabinet;
  }

  // Heuristiques domaines / boîtes connues
  if (emails.some((e) => e.includes("2rconseil") || e.startsWith("conseil@"))) {
    return "conseil";
  }
  if (
    emails.some(
      (e) =>
        e.includes("2ref@") ||
        e.includes("expertise") ||
        e.startsWith("2ref@"),
    )
  ) {
    return "expertise_fiscale";
  }
  return null;
}

function extractEmails(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((part) => bareEmail(part.trim()).toLowerCase())
    .filter((e) => e.includes("@"));
}

/** Destinataire Inbound lié à l’app (domaine 2r-hub.com ou adresse cabinet). */
function isAppInboundRecipient(
  toEmail: string,
  allowed: Set<string>,
): boolean {
  const emails = extractEmails(toEmail);
  if (emails.length === 0) return false;
  return emails.some(
    (e) => allowed.has(e) || e.endsWith(`@${APP_MAIL_DOMAIN}`),
  );
}

/**
 * Uniquement les mails de l’app :
 * - envoyés : journalisés à l’envoi (documentId / staffId)
 * - reçus : adressés aux boîtes @2r-hub.com / Reply-To cabinets
 */
function appMailsOnlyWhere(
  allowedInbound: Set<string>,
): Prisma.MailMessageWhereInput {
  const inboundOr: Prisma.MailMessageWhereInput[] = [
    { toEmail: { contains: `@${APP_MAIL_DOMAIN}`, mode: "insensitive" } },
  ];
  for (const addr of allowedInbound) {
    inboundOr.push({
      toEmail: { contains: addr, mode: "insensitive" },
    });
  }

  return {
    OR: [
      {
        direction: "outbound",
        OR: [{ documentId: { not: null } }, { staffId: { not: null } }],
      },
      {
        direction: "inbound",
        OR: inboundOr,
      },
    ],
  };
}

/** Notifie le collaborateur qui a envoyé le dernier mail à ce client. */
async function notifySenderOfClientReply(input: {
  fromEmail: string;
  subject: string;
  cabinet: Cabinet;
}) {
  const clientEmail = bareEmail(input.fromEmail).toLowerCase();
  if (!clientEmail.includes("@")) return;

  const previous = await prisma.mailMessage.findFirst({
    where: {
      direction: "outbound",
      staffId: { not: null },
      toEmail: { contains: clientEmail, mode: "insensitive" },
      OR: [{ cabinet: input.cabinet }, { cabinet: null }],
    },
    orderBy: { createdAt: "desc" },
    select: { staffId: true, documentId: true },
  });
  if (!previous?.staffId) return;

  const already = await prisma.notification.findFirst({
    where: {
      staffId: previous.staffId,
      title: "Réponse e-mail reçue",
      body: { contains: clientEmail },
      at: { gte: new Date(Date.now() - 2 * 60_000) },
    },
    select: { id: true },
  });
  if (already) return;

  await prisma.notification.create({
    data: {
      staffId: previous.staffId,
      documentId: previous.documentId,
      cabinet: input.cabinet,
      title: "Réponse e-mail reçue",
      body: `${clientEmail} a répondu : ${input.subject}`,
      type: "info",
    },
  });
}

/** Liste les mails envoyés / reçus liés à l’application uniquement. */
export const listMails = createServerFn({ method: "GET" })
  .validator(
    z.object({
      direction: z.enum(["outbound", "inbound", "all"]).default("all"),
      limit: z.number().int().min(1).max(100).default(50),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const allowed = await appMailAddresses();
    const cabinet = session.activeCabinet;

    // Anciens mails sans cabinet mais liés à un document du cabinet actif
    const linkedDocs = await prisma.document.findMany({
      where: { cabinet },
      select: { id: true },
    });
    const linkedDocIds = linkedDocs.map((d) => d.id);

    const rows = await prisma.mailMessage.findMany({
      where: {
        AND: [
          {
            OR: [
              { cabinet },
              ...(linkedDocIds.length
                ? [{ cabinet: null, documentId: { in: linkedDocIds } }]
                : []),
            ],
          },
          appMailsOnlyWhere(allowed),
          data.direction === "all" ? {} : { direction: data.direction },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: data.limit,
    });

    const items = await filterMailsForMember(session.staff, rows.map(mapMailRow));
    return {
      items,
      inboundConfigured: allowed.size > 0,
    };
  });

export const getMail = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const cabinet = session.activeCabinet;
    const linkedDocs = await prisma.document.findMany({
      where: { cabinet },
      select: { id: true },
    });
    const linkedDocIds = linkedDocs.map((d) => d.id);

    const row = await prisma.mailMessage.findFirst({
      where: {
        id: data.id,
        OR: [
          { cabinet },
          ...(linkedDocIds.length
            ? [{ cabinet: null, documentId: { in: linkedDocIds } }]
            : []),
        ],
      },
    });
    if (!row) throw new Error("Message introuvable");
    const visible = await filterMailsForMember(session.staff, [row]);
    if (visible.length === 0) throw new Error("Message introuvable");

    // Enrichir un reçu via Resend si le corps manque
    if (
      row.direction === "inbound" &&
      row.resendId &&
      !row.htmlBody &&
      !row.textBody
    ) {
      try {
        const detail = await resendFetch<ResendReceivedDetail>(
          `/emails/receiving/${row.resendId}`,
        );
        const html = detail.html ?? null;
        const text = detail.text ?? null;
        const updated = await prisma.mailMessage.update({
          where: { id: row.id },
          data: {
            htmlBody: html,
            textBody: text,
            preview:
              text?.slice(0, 180) ||
              (html ? htmlToPreview(html) : row.preview),
          },
        });
        return {
          ...mapMailRow(updated),
          htmlBody: updated.htmlBody,
          textBody: updated.textBody,
        };
      } catch {
        // garde la ligne DB
      }
    }

    return {
      ...mapMailRow(row),
      htmlBody: row.htmlBody,
      textBody: row.textBody,
    };
  });

/**
 * Importe uniquement les réponses reçues sur les adresses de l’app (Inbound).
 * Les envois sont journalisés à l’envoi depuis l’app — pas d’import Resend « sent ».
 */
export const syncInboundMails = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await requireSession();
    const allowed = await appMailAddresses();
    let imported = 0;
    let skipped = 0;
    let error: string | null = null;

    try {
      const list = await resendFetch<ResendReceivedList>(
        "/emails/receiving?limit=50",
      );
      for (const item of list.data ?? []) {
        const fromEmail = item.from?.trim() || "inconnu";
        const toEmail = asAddressList(item.to) || "—";
        if (!isAppInboundRecipient(toEmail, allowed)) {
          skipped += 1;
          continue;
        }

        const subject = item.subject?.trim() || "(sans objet)";
        const createdAt = item.created_at
          ? new Date(item.created_at)
          : new Date();

        const existing = item.id
          ? await prisma.mailMessage.findUnique({
              where: { resendId: item.id },
              select: { id: true },
            })
          : null;
        const isNew = !existing;

        let html: string | null = null;
        let text: string | null = null;
        try {
          const detail = await resendFetch<ResendReceivedDetail>(
            `/emails/receiving/${item.id}`,
          );
          html = detail.html ?? null;
          text = detail.text ?? null;
        } catch {
          // metadata only
        }

        const preview =
          text?.replace(/\s+/g, " ").trim().slice(0, 180) ||
          (html ? htmlToPreview(html) : "");

        const resolvedCabinet =
          (await resolveCabinetFromToEmail(toEmail)) ??
          (session.activeCabinet as Cabinet);

        await prisma.mailMessage.upsert({
          where: { resendId: item.id },
          create: {
            direction: "inbound",
            cabinet: resolvedCabinet,
            resendId: item.id,
            fromEmail,
            toEmail,
            subject,
            preview,
            htmlBody: html,
            textBody: text,
            lastEvent: "received",
            createdAt,
          },
          update: {
            subject,
            preview: preview || undefined,
            htmlBody: html ?? undefined,
            textBody: text ?? undefined,
            lastEvent: "received",
            // Réattribue le cabinet si on peut le déduire de l’adresse To
            cabinet: resolvedCabinet,
          },
        });
        imported += 1;

        if (isNew) {
          await notifySenderOfClientReply({
            fromEmail,
            subject,
            cabinet: resolvedCabinet,
          });
        }
      }
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : "Impossible de synchroniser les e-mails reçus";
      if (/not found|404|receiving|inbound/i.test(error)) {
        error =
          "Réception Resend non configurée. Activez Inbound sur votre domaine et définissez RESEND_REPLY_TO.";
      }
    }

    return { imported, skipped, error };
  },
);

/** Vide l’historique local (envoyés + reçus) du cabinet actif. Super admin : tout. */
export const clearMailHistory = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await requireSession();
    if (!isAdmin(session.staff.role)) {
      throw new Error("Réservé aux administrateurs");
    }

    const result = await prisma.mailMessage.deleteMany({
      where:
        session.staff.role === "super_admin"
          ? {}
          : { cabinet: session.activeCabinet },
    });
    return { deleted: result.count };
  },
);

/** Réponse manuelle à un client depuis l’espace mails. */
export const replyToMail = createServerFn({ method: "POST" })
  .validator(
    z.object({
      mailId: z.string(),
      body: z.string().min(1, "Message vide").max(20_000),
    }),
  )
  .handler(async ({ data }) => {
    requireResendApiKey();
    const session = await requireSession();
    const { staff, activeCabinet } = session;
    const cabinet = activeCabinet;

    const linkedDocs = await prisma.document.findMany({
      where: { cabinet },
      select: { id: true },
    });
    const linkedDocIds = linkedDocs.map((d) => d.id);

    const row = await prisma.mailMessage.findFirst({
      where: {
        id: data.mailId,
        OR: [
          { cabinet },
          ...(linkedDocIds.length
            ? [{ cabinet: null, documentId: { in: linkedDocIds } }]
            : []),
        ],
      },
    });
    if (!row) throw new Error("Message introuvable");

    const clientEmail = bareEmail(
      row.direction === "inbound" ? row.fromEmail : row.toEmail,
    );
    if (!clientEmail.includes("@")) {
      throw new Error("Adresse du destinataire invalide");
    }

    const companyRow = await prisma.company.findUnique({
      where: { cabinet },
    });
    const company = companyForPreview(companyRow, cabinet);
    const { from, replyTo } = resolveCabinetMailAddresses(company);
    const managerCc = resolveManagerCc(company, clientEmail);

    const subject = /^\s*re\s*:/i.test(row.subject.trim())
      ? row.subject.trim()
      : `Re: ${row.subject.trim() || "(sans objet)"}`;
    const text = data.body.trim();
    const html = `<div style="font-family:system-ui,sans-serif;line-height:1.55;color:#0f172a;white-space:pre-wrap">${escapeHtml(text)}</div>`;

    const resend = getResend();
    const { data: sent, error } = await resend.emails.send({
      from,
      to: clientEmail,
      ...(managerCc ? { cc: [managerCc] } : {}),
      subject,
      html,
      text,
      ...(replyTo ? { replyTo: [replyTo] } : {}),
    });
    if (error) throw new Error(resendErrorMessage(error));

    await logOutboundMail({
      cabinet,
      resendId: sent?.id ?? null,
      fromEmail: from,
      toEmail: clientEmail,
      ccEmail: managerCc ?? null,
      subject,
      html,
      text,
      documentId: row.documentId,
      clientId: row.clientId,
      staffId: staff.id,
      lastEvent: "sent",
    });

    return { ok: true as const, to: clientEmail, subject };
  });

export type { MailListItem };
