import type { Cabinet, MailDirection } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function htmlToPreview(html: string, max = 180): string {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export type LogOutboundMailInput = {
  cabinet?: Cabinet | null;
  resendId?: string | null;
  fromEmail: string;
  toEmail: string | string[];
  subject: string;
  html?: string | null;
  text?: string | null;
  documentId?: string | null;
  clientId?: string | null;
  staffId?: string | null;
  lastEvent?: string | null;
};

export async function logOutboundMail(input: LogOutboundMailInput) {
  const to = Array.isArray(input.toEmail)
    ? input.toEmail.join(", ")
    : input.toEmail;
  const preview =
    input.text?.trim() ||
    (input.html ? htmlToPreview(input.html) : "");

  try {
    if (input.resendId) {
      return await prisma.mailMessage.upsert({
        where: { resendId: input.resendId },
        create: {
          direction: "outbound",
          cabinet: input.cabinet ?? null,
          resendId: input.resendId,
          fromEmail: input.fromEmail,
          toEmail: to,
          subject: input.subject,
          preview,
          htmlBody: input.html ?? null,
          textBody: input.text ?? null,
          documentId: input.documentId ?? null,
          clientId: input.clientId ?? null,
          staffId: input.staffId ?? null,
          lastEvent: input.lastEvent ?? "sent",
        },
        update: {
          lastEvent: input.lastEvent ?? "sent",
          preview,
          htmlBody: input.html ?? undefined,
        },
      });
    }

    return await prisma.mailMessage.create({
      data: {
        direction: "outbound",
        cabinet: input.cabinet ?? null,
        fromEmail: input.fromEmail,
        toEmail: to,
        subject: input.subject,
        preview,
        htmlBody: input.html ?? null,
        textBody: input.text ?? null,
        documentId: input.documentId ?? null,
        clientId: input.clientId ?? null,
        staffId: input.staffId ?? null,
        lastEvent: input.lastEvent ?? "sent",
      },
    });
  } catch (err) {
    console.warn("[logOutboundMail]", err);
    return null;
  }
}

export type MailListItem = {
  id: string;
  direction: MailDirection;
  cabinet: Cabinet | null;
  resendId: string | null;
  fromEmail: string;
  toEmail: string;
  subject: string;
  preview: string;
  documentId: string | null;
  clientId: string | null;
  lastEvent: string | null;
  createdAt: string;
  isReply: boolean;
};

export function mapMailRow(row: {
  id: string;
  direction: MailDirection;
  cabinet: Cabinet | null;
  resendId: string | null;
  fromEmail: string;
  toEmail: string;
  subject: string;
  preview: string;
  documentId: string | null;
  clientId: string | null;
  lastEvent: string | null;
  createdAt: Date;
}): MailListItem {
  const subject = row.subject || "(sans objet)";
  const isReply =
    row.direction === "inbound" &&
    (/^\s*(re|ré|fw|fwd)\s*:/i.test(subject) ||
      subject.toLowerCase().includes("re:"));

  return {
    id: row.id,
    direction: row.direction,
    cabinet: row.cabinet,
    resendId: row.resendId,
    fromEmail: row.fromEmail,
    toEmail: row.toEmail,
    subject,
    preview: row.preview,
    documentId: row.documentId,
    clientId: row.clientId,
    lastEvent: row.lastEvent,
    createdAt: row.createdAt.toISOString(),
    isReply,
  };
}
