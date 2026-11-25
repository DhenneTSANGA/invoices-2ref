import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/prisma";
import { resolveBillingStaff } from "@/lib/billing-jobs";
import { sendDocumentEmailInternal } from "@/lib/send-document-email";
import { renderDocumentPdfOnServer } from "@/lib/pdf/server-render";
import { documentTypeLabel } from "@/lib/document-status-labels";
import { getResend } from "@/lib/resend";
import { escapeHtml, resendErrorMessage } from "@/lib/email";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthBounds(month: string): { from: Date; to: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error("month doit être au format AAAA-MM");
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return {
    from: new Date(Date.UTC(year, monthIndex, 1)),
    to: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

type BackfillBody = {
  action?: "list" | "render" | "test" | "send";
  month?: string;
  documentId?: string;
  testEmail?: string;
  onlyMissingPdf?: boolean;
  limit?: number;
  appUrl?: string;
};

/**
 * Rattrapage des factures d’abonnement envoyées sans pièce jointe.
 * Un document par appel pour rester sous la limite de temps des fonctions.
 */
export const Route = createFileRoute("/api/cron/subscription-pdf-backfill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorizeCron(request)) {
          return Response.json({ error: "Non autorisé" }, { status: 401 });
        }

        let body: BackfillBody;
        try {
          body = (await request.json()) as BackfillBody;
        } catch {
          body = {};
        }

        try {
          const origin = new URL(request.url).origin;
          const appUrl = body.appUrl?.trim() || origin;

          if (body.action === "render" || body.action === "test" || body.action === "send") {
            if (!body.documentId) {
              return Response.json({ error: "documentId requis" }, { status: 400 });
            }
            return Response.json(
              await processDocument({
                documentId: body.documentId,
                action: body.action,
                appUrl,
                testEmail: body.testEmail,
              }),
            );
          }

          const month = body.month?.trim() || currentMonth();
          const { from, to } = monthBounds(month);
          const rows = await prisma.document.findMany({
            where: {
              type: "invoice",
              subscriptionOfId: { not: null },
              issueDate: { gte: from, lt: to },
              status: { in: ["signed", "sent", "paid"] },
            },
            orderBy: { number: "asc" },
            take: Math.min(Math.max(Number(body.limit) || 100, 1), 200),
            select: {
              id: true,
              number: true,
              status: true,
              issueDate: true,
              total: true,
              client: { select: { name: true, email: true } },
              pdfTraces: {
                where: { action: "email" },
                select: { fileUrl: true, createdAt: true },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          });

          const ids = rows.map((row) => row.id);
          const mails = await prisma.mailMessage.findMany({
            where: { documentId: { in: ids }, direction: "outbound" },
            select: { documentId: true, toEmail: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          });
          const mailByDoc = new Map<string, string[]>();
          for (const mail of mails) {
            if (!mail.documentId) continue;
            const list = mailByDoc.get(mail.documentId) ?? [];
            if (!list.includes(mail.toEmail)) list.push(mail.toEmail);
            mailByDoc.set(mail.documentId, list);
          }

          const candidates = rows
            .filter((row) => (body.onlyMissingPdf === false ? true : row.pdfTraces.length === 0))
            .map((row) => ({
              id: row.id,
              number: row.number,
              status: row.status,
              issueDate: row.issueDate.toISOString().slice(0, 10),
              total: Number(row.total),
              client: row.client?.name ?? "",
              originalRecipients: mailByDoc.get(row.id) ?? [],
              hadMail: (mailByDoc.get(row.id) ?? []).length > 0,
              hasEmailPdfTrace: row.pdfTraces.length > 0,
              pdfUrl: row.pdfTraces[0]?.fileUrl ?? null,
            }));

          return Response.json({
            ok: true,
            month,
            total: candidates.length,
            candidates,
          });
        } catch (err) {
          console.error("[cron/subscription-pdf-backfill]", err);
          return Response.json(
            { error: err instanceof Error ? err.message : "Erreur serveur" },
            { status: 500 },
          );
        }
      },
    },
  },
});

async function processDocument({
  documentId,
  action,
  appUrl,
  testEmail,
}: {
  documentId: string;
  action: "render" | "test" | "send";
  appUrl: string;
  testEmail?: string;
}) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      number: true,
      type: true,
      status: true,
      cabinet: true,
      createdById: true,
    },
  });
  if (!doc) throw new Error("Document introuvable");
  if (doc.type !== "invoice") throw new Error("Type « facture » attendu");

  const pdf = await renderDocumentPdfOnServer(doc.id, { appUrl });
  const rendered = {
    ok: true as const,
    number: doc.number,
    fileName: pdf.fileName,
    pdfBytes: Buffer.byteLength(pdf.base64, "base64"),
    previewBytes: pdf.previewBase64 ? Buffer.byteLength(pdf.previewBase64, "base64") : 0,
  };

  if (action === "render") return rendered;

  if (action === "test") {
    const to = testEmail?.trim();
    if (!to) throw new Error("testEmail requis");
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL?.trim() || "2ref@2r-hub.com",
      to,
      subject: `[TEST] Facture ${doc.number} — PDF joint`,
      html: `<p>Test de pièce jointe PDF pour la facture ${escapeHtml(doc.number)}.</p>`,
      attachments: [
        {
          filename: pdf.fileName,
          content: Buffer.from(pdf.base64, "base64"),
        },
      ],
    });
    if (error) throw new Error(resendErrorMessage(error));
    return { ...rendered, testEmail: to, emailId: data?.id ?? null };
  }

  if (doc.status === "cancelled") {
    throw new Error("Facture annulée — renvoi refusé");
  }
  const staff = await resolveBillingStaff(doc.cabinet, doc.createdById);
  if (!staff) throw new Error("Aucun staff admin pour le renvoi");

  const originalMails = await prisma.mailMessage.findMany({
    where: { documentId: doc.id, direction: "outbound" },
    select: { toEmail: true },
    orderBy: { createdAt: "desc" },
  });
  const recipients = [...new Set(originalMails.map((m) => m.toEmail).filter(Boolean))].slice(0, 3);

  const send = (to?: string[]) =>
    sendDocumentEmailInternal({
      documentId: doc.id,
      staff,
      skipAccessCheck: true,
      pdfBase64: pdf.base64,
      fileName: pdf.fileName,
      previewImageBase64: pdf.previewBase64,
      ...(to?.length ? { recipients: to } : {}),
    });

  let sent;
  try {
    sent = await send(recipients);
  } catch (err) {
    // Adresse historique devenue invalide : on retombe sur l’adresse du client.
    if (!recipients.length) throw err;
    sent = await send();
  }

  return {
    ...rendered,
    to: sent.to,
    subject: sent.subject,
    pdfUrl: sent.pdfUrl,
    failed: sent.failed,
    typeLabel: documentTypeLabel("invoice"),
  };
}
