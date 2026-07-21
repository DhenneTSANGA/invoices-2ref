import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session.functions";
import { getResend } from "@/lib/resend";
import { REAL_2REF_COMPANY } from "@/lib/company-defaults";
import {
  escapeHtml,
  formatFrom,
  requireResendConfig,
  resendErrorMessage,
} from "@/lib/email";
import {
  broadcastDocumentStatusChange,
  staffDisplayName,
} from "@/lib/notify-document-status";
import { documentTypeLabel } from "@/lib/document-status-labels";
import type { DocumentType } from "@/store/types";

async function requireStaff() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  return session.staff;
}

function money(n: number | { toNumber?: () => number } | string, currency = "XAF") {
  const value =
    typeof n === "number"
      ? n
      : typeof n === "string"
        ? Number(n)
        : typeof n?.toNumber === "function"
          ? n.toNumber()
          : Number(n);
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(value) ? value : 0) +
    " " +
    currency
  );
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function buildCommercialEmailHtml(params: {
  companyName: string;
  typeLabel: string;
  number: string;
  clientName: string;
  contactName: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  lines: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  tps: number;
  css: number;
  vat: number;
  total: number;
  notes?: string | null;
}): string {
  const rows = params.lines
    .map(
      (l) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(l.description)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${l.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${escapeHtml(money(l.unitPrice, params.currency))}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${escapeHtml(money(l.total, params.currency))}</td>
      </tr>`,
    )
    .join("");

  const taxRows = [
    params.tps > 0
      ? `<tr><td style="padding:4px 0;color:#64748b;">TPS</td><td style="padding:4px 0;text-align:right;">${escapeHtml(money(params.tps, params.currency))}</td></tr>`
      : "",
    params.css > 0
      ? `<tr><td style="padding:4px 0;color:#64748b;">CSS</td><td style="padding:4px 0;text-align:right;">${escapeHtml(money(params.css, params.currency))}</td></tr>`
      : "",
    `<tr><td style="padding:4px 0;color:#64748b;">TVA</td><td style="padding:4px 0;text-align:right;">${escapeHtml(money(params.vat, params.currency))}</td></tr>`,
  ].join("");

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="font-family:'Segoe UI',Tahoma,sans-serif;color:#1e293b;max-width:640px;margin:0 auto;padding:32px 24px;">
  <div style="border-bottom:2px solid #1E40AF;padding-bottom:16px;margin-bottom:24px;">
    <strong style="font-size:18px;color:#1E40AF;">${escapeHtml(params.companyName)}</strong>
    <div style="margin-top:4px;font-size:13px;color:#64748b;">${escapeHtml(params.typeLabel)} ${escapeHtml(params.number)}</div>
  </div>
  <p style="font-size:14px;line-height:1.7;">
    Bonjour ${escapeHtml(params.contactName || params.clientName)},
  </p>
  <p style="font-size:14px;line-height:1.7;">
    Veuillez trouver ci-dessous le détail de votre <strong>${escapeHtml(params.typeLabel.toLowerCase())}</strong>
    n° <strong>${escapeHtml(params.number)}</strong>.
  </p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:20px 0;font-size:13px;">
    <div><span style="color:#64748b;">Client :</span> <strong>${escapeHtml(params.clientName)}</strong></div>
    <div><span style="color:#64748b;">Émission :</span> ${escapeHtml(params.issueDate)}</div>
    <div><span style="color:#64748b;">Échéance :</span> ${escapeHtml(params.dueDate)}</div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
    <thead>
      <tr style="background:#1E40AF;color:#fff;">
        <th style="text-align:left;padding:10px;">Description</th>
        <th style="text-align:right;padding:10px;">Qté</th>
        <th style="text-align:right;padding:10px;">P.U.</th>
        <th style="text-align:right;padding:10px;">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <table style="width:100%;max-width:280px;margin-left:auto;margin-top:16px;font-size:13px;">
    <tr><td style="padding:4px 0;color:#64748b;">Sous-total</td><td style="padding:4px 0;text-align:right;">${escapeHtml(money(params.subtotal, params.currency))}</td></tr>
    ${taxRows}
    <tr>
      <td style="padding:10px 0 0;font-weight:700;border-top:2px solid #1E40AF;">Total TTC</td>
      <td style="padding:10px 0 0;text-align:right;font-weight:700;border-top:2px solid #1E40AF;">${escapeHtml(money(params.total, params.currency))}</td>
    </tr>
  </table>
  ${
    params.notes
      ? `<p style="margin-top:24px;font-size:13px;color:#475569;"><strong>Notes :</strong> ${escapeHtml(params.notes)}</p>`
      : ""
  }
  <p style="margin-top:28px;font-size:14px;line-height:1.7;">
    Cordialement,<br/>${escapeHtml(params.companyName)}
  </p>
  <div style="margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#94a3b8;">
    ${escapeHtml(params.companyName)} — Document conforme aux usages OHADA / zone CEMAC
  </div>
</body>
</html>`.trim();
}

function buildLetterEmailHtml(params: {
  companyName: string;
  subject: string;
  body: string;
  closing: string;
  signatoryTitle: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="font-family:'Segoe UI',Tahoma,sans-serif;color:#1e293b;max-width:640px;margin:0 auto;padding:32px 24px;">
  <div style="border-bottom:2px solid #B45309;padding-bottom:16px;margin-bottom:24px;">
    <strong style="font-size:18px;color:#B45309;">${escapeHtml(params.companyName)}</strong>
  </div>
  <div style="font-size:14px;font-weight:600;margin-bottom:16px;">
    Objet : ${escapeHtml(params.subject)}
  </div>
  <div style="white-space:pre-line;line-height:1.8;font-size:14px;">
${escapeHtml(params.body)}
  </div>
  ${
    params.closing
      ? `<div style="margin-top:32px;white-space:pre-line;font-size:14px;">${escapeHtml(params.closing)}</div>`
      : ""
  }
  ${
    params.signatoryTitle
      ? `<div style="margin-top:24px;font-size:13px;color:#B45309;">${escapeHtml(params.signatoryTitle)}</div>`
      : ""
  }
  <div style="margin-top:48px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#94a3b8;">
    ${escapeHtml(params.companyName)} — Document conforme aux usages OHADA / zone CEMAC
  </div>
</body>
</html>`.trim();
}

function lineAmount(quantity: number, unitPrice: number, discount: number) {
  return quantity * unitPrice * (1 - (discount || 0) / 100);
}

export const sendDocumentEmail = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const { fromEmail } = requireResendConfig();

    const doc = await prisma.document.findUnique({
      where: { id: data.id },
      include: {
        lines: { orderBy: { position: "asc" } },
        client: true,
      },
    });
    if (!doc) throw new Error("Document introuvable");
    if (staff.role !== "admin" && doc.createdById !== staff.id) {
      throw new Error("Accès refusé");
    }
    if (!doc.client) throw new Error("Client introuvable");
    if (!doc.client.email?.trim()) {
      throw new Error(`Le client « ${doc.client.name} » n'a pas d'adresse email`);
    }

    const company = (await prisma.company.findFirst()) ?? REAL_2REF_COMPANY;
    const typeLabel = documentTypeLabel(doc.type as DocumentType);
    const from = formatFrom(company.name, fromEmail);
    const to = doc.client.email.trim();

    let subject: string;
    let html: string;

    if (doc.type === "letter") {
      subject = doc.subject?.trim() || `${typeLabel} ${doc.number}`;
      const letterBody = [doc.salutation, doc.body].filter(Boolean).join("\n\n");
      html = buildLetterEmailHtml({
        companyName: company.name,
        subject,
        body: letterBody || "Veuillez trouver notre courrier ci-joint.",
        closing: doc.closing ?? "",
        signatoryTitle: doc.signatoryTitle || staff.jobTitle,
      });
    } else {
      const currency = doc.currency || "XAF";
      const lines = doc.lines.map((l) => {
        const quantity = Number(l.quantity);
        const unitPrice = Number(l.unitPrice);
        const discount = Number(l.discount);
        return {
          description: l.description,
          quantity,
          unitPrice,
          total: lineAmount(quantity, unitPrice, discount),
        };
      });
      subject = `${typeLabel} ${doc.number} — ${company.name}`;
      html = buildCommercialEmailHtml({
        companyName: company.name,
        typeLabel,
        number: doc.number,
        clientName: doc.client.name,
        contactName: doc.client.contactName,
        issueDate: formatDate(doc.issueDate),
        dueDate: formatDate(doc.dueDate),
        currency,
        lines,
        subtotal: Number(doc.subtotal),
        tps: Number(doc.tps),
        css: Number(doc.css),
        vat: Number(doc.vat),
        total: Number(doc.total),
        notes: doc.notes,
      });
    }

    const resend = getResend();
    const { data: sent, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[sendDocumentEmail]", doc.number, to, error);
      throw new Error(resendErrorMessage(error));
    }

    const previousStatus = doc.status;
    const updated =
      previousStatus === "sent"
        ? doc
        : await prisma.document.update({
            where: { id: doc.id },
            data: { status: "sent" },
            include: {
              lines: { orderBy: { position: "asc" } },
              createdBy: true,
              client: true,
            },
          });

    if (previousStatus !== "sent") {
      await broadcastDocumentStatusChange({
        actorStaffId: staff.id,
        actorName: staffDisplayName(staff),
        documentId: updated.id,
        documentNumber: updated.number,
        documentType: updated.type as DocumentType,
        previousStatus: previousStatus as never,
        nextStatus: "sent",
      });
    }

    return {
      ok: true as const,
      emailId: sent?.id ?? null,
      to,
      subject,
      documentId: doc.id,
      number: doc.number,
      type: doc.type as DocumentType,
    };
  });
