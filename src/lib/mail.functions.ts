import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Cabinet } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session.functions";
import { isSuperAdmin } from "@/lib/roles";
import { htmlToPreview, mapMailRow, type MailListItem } from "@/lib/mail-log";

async function requireSession() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  return session;
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

type ResendSentList = {
  data?: Array<{
    id: string;
    to?: string[] | string | null;
    from?: string | null;
    subject?: string | null;
    created_at?: string;
    last_event?: string | null;
  }>;
};

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

/** Liste les mails envoyés (DB) et reçus (DB + sync Resend optionnelle). */
export const listMails = createServerFn({ method: "GET" })
  .validator(
    z.object({
      direction: z.enum(["outbound", "inbound", "all"]).default("all"),
      limit: z.number().int().min(1).max(100).default(50),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const whereCabinet = isSuperAdmin(session.staff.role)
      ? {}
      : {
          OR: [
            { cabinet: session.activeCabinet },
            { cabinet: null },
          ],
        };

    const rows = await prisma.mailMessage.findMany({
      where: {
        ...whereCabinet,
        ...(data.direction === "all" ? {} : { direction: data.direction }),
      },
      orderBy: { createdAt: "desc" },
      take: data.limit,
    });

    return {
      items: rows.map(mapMailRow),
      inboundConfigured: Boolean(process.env.RESEND_REPLY_TO?.trim()),
    };
  });

export const getMail = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireSession();
    const row = await prisma.mailMessage.findUnique({ where: { id: data.id } });
    if (!row) throw new Error("Message introuvable");

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
 * Importe les e-mails reçus (réponses) depuis Resend Inbound.
 * Nécessite un domaine / adresse de réception configurés côté Resend.
 */
export const syncInboundMails = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await requireSession();
    let imported = 0;
    let error: string | null = null;

    try {
      const list = await resendFetch<ResendReceivedList>(
        "/emails/receiving?limit=50",
      );
      for (const item of list.data ?? []) {
        const fromEmail = item.from?.trim() || "inconnu";
        const toEmail = asAddressList(item.to) || "—";
        const subject = item.subject?.trim() || "(sans objet)";
        const createdAt = item.created_at
          ? new Date(item.created_at)
          : new Date();

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

        await prisma.mailMessage.upsert({
          where: { resendId: item.id },
          create: {
            direction: "inbound",
            cabinet: session.activeCabinet as Cabinet,
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
          },
        });
        imported += 1;
      }
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : "Impossible de synchroniser les e-mails reçus";
      // Resend Inbound non activé → message clair
      if (/not found|404|receiving|inbound/i.test(error)) {
        error =
          "Réception Resend non configurée. Activez Inbound sur votre domaine et définissez RESEND_REPLY_TO.";
      }
    }

    // Optionnel : importer aussi l’historique d’envois Resend non encore loggés
    try {
      const sent = await resendFetch<ResendSentList>("/emails?limit=30");
      for (const item of sent.data ?? []) {
        if (!item.id) continue;
        const existing = await prisma.mailMessage.findUnique({
          where: { resendId: item.id },
        });
        if (existing) continue;
        await prisma.mailMessage.create({
          data: {
            direction: "outbound",
            cabinet: session.activeCabinet,
            resendId: item.id,
            fromEmail: item.from?.trim() || "—",
            toEmail: asAddressList(item.to) || "—",
            subject: item.subject?.trim() || "(sans objet)",
            preview: "",
            lastEvent: item.last_event ?? "sent",
            createdAt: item.created_at
              ? new Date(item.created_at)
              : new Date(),
          },
        });
        imported += 1;
      }
    } catch {
      // liste sent optionnelle
    }

    return { imported, error };
  },
);

export type { MailListItem };
