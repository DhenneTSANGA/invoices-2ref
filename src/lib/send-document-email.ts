import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session.functions";
import { getResend } from "@/lib/resend";
import { companyForPreview } from "@/lib/company-defaults";
import { DOCUMENT_COLORS, niuLabelForCabinet } from "@/lib/cabinets";
import {
  escapeHtml,
  requireResendApiKey,
  resolveCabinetMailAddresses,
  resolveManagerCc,
  resendErrorMessage,
} from "@/lib/email";
import {
  broadcastDocumentStatusChange,
  staffDisplayName,
} from "@/lib/notify-document-status";
import { documentTypeLabel } from "@/lib/document-status-labels";
import { canWriteDocument, isAdmin, isSuperAdmin } from "@/lib/roles";
import type { CompanyInfo, DocumentType } from "@/store/types";
import { logOutboundMail } from "@/lib/mail-log";
import {
  clientLetterRecipientLines,
  clientDisplayName,
  clientRepresentativeLine,
  clientDocumentLines,
} from "@/lib/client-address";

async function requireSession() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  return session;
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

type EmailAccent = { accent: string; accentTo: string };

function emailShell(params: {
  accent: EmailAccent;
  company: CompanyInfo;
  typeTitle: string;
  number: string;
  issueDate?: string;
  bodyHtml: string;
  niuLabel?: string;
}): string {
  const { accent, accentTo } = params.accent;
  const c = params.company;
  const niuLabel = params.niuLabel ?? "NIU";
  const legalBits = [
    c.tagline,
    [c.address, c.city].filter(Boolean).join(", "),
    c.rccm && c.rccm !== "—" ? `RCCM : ${c.rccm}` : "",
    c.nif && c.nif !== "—" ? `NIF : ${c.nif}` : "",
    c.niu && c.niu !== "—" ? `${niuLabel} : ${c.niu}` : "",
    c.phone ? `Tél. : ${c.phone}` : "",
    c.email,
  ].filter(Boolean);

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#0F172A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg, ${accent}, ${accentTo});font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 20px;border-bottom:2px solid ${accent};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top" style="padding-right:16px;">
                    <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${accent};line-height:1.25;">
                      ${escapeHtml(c.name)}
                    </div>
                    ${
                      c.tagline
                        ? `<div style="margin-top:4px;font-size:12px;color:#64748B;line-height:1.4;">${escapeHtml(c.tagline)}</div>`
                        : ""
                    }
                  </td>
                  <td valign="top" align="right" style="white-space:nowrap;">
                    <div style="font-size:22px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${accent};line-height:1.2;">
                      ${escapeHtml(params.typeTitle)}
                    </div>
                    <div style="margin-top:4px;font-size:13px;font-weight:600;color:#0F172A;">N° ${escapeHtml(params.number)}</div>
                    ${
                      params.issueDate
                        ? `<div style="margin-top:2px;font-size:12px;color:#64748B;">${escapeHtml(params.issueDate)}</div>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;">
              <div style="border-top:1px solid #E2E8F0;padding-top:14px;font-size:11px;line-height:1.55;color:#94A3B8;text-align:center;">
                ${escapeHtml(legalBits.join(" · "))}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function buildCommercialEmailHtml(params: {
  company: CompanyInfo;
  type: "invoice" | "quotation";
  typeLabel: string;
  number: string;
  clientName: string;
  contactName: string;
  clientLines: string[];
  clientNif?: string;
  clientRccm?: string;
  clientCnss?: string;
  clientCnamgs?: string;
  issueDate: string;
  dueDate?: string | null;
  currency: string;
  lines: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  tps: number;
  css: number;
  vat: number;
  total: number;
  notes?: string | null;
  niuLabel: string;
}): string {
  const colors = DOCUMENT_COLORS[params.type];
  const { accent, accentTo } = colors;

  const rows = params.lines
    .map(
      (l, i) => `
      <tr style="background:${i % 2 === 0 ? "#FFFFFF" : "#F8FAFC"};">
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0F172A;">${escapeHtml(l.description)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right;font-size:13px;color:#475569;">${l.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right;font-size:13px;color:#475569;">${escapeHtml(money(l.unitPrice, params.currency))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right;font-size:13px;font-weight:600;color:#0F172A;">${escapeHtml(money(l.total, params.currency))}</td>
      </tr>`,
    )
    .join("");

  const taxRows = [
    params.tps > 0
      ? `<tr><td style="padding:6px 12px;color:#64748B;font-size:13px;">TPS</td><td style="padding:6px 12px;text-align:right;font-size:13px;">${escapeHtml(money(params.tps, params.currency))}</td></tr>`
      : "",
    params.css > 0
      ? `<tr><td style="padding:6px 12px;color:#64748B;font-size:13px;">CSS</td><td style="padding:6px 12px;text-align:right;font-size:13px;">${escapeHtml(money(params.css, params.currency))}</td></tr>`
      : "",
    params.tps <= 0
      ? `<tr><td style="padding:6px 12px;color:#64748B;font-size:13px;">TVA</td><td style="padding:6px 12px;text-align:right;font-size:13px;">${escapeHtml(money(params.vat, params.currency))}</td></tr>`
      : "",
  ].join("");

  const emitterLines = [
    params.company.capital,
    params.company.address,
    params.company.city,
    [params.company.phone, params.company.email].filter(Boolean).join(" · "),
  ].filter(Boolean);

  const emitterLegalBits = [
    params.company.nif && params.company.nif !== "—"
      ? `NIF : ${params.company.nif}`
      : "",
    params.company.niu && params.company.niu !== "—"
      ? `${params.niuLabel} : ${params.company.niu}`
      : "",
    params.company.rccm && params.company.rccm !== "—"
      ? `RCCM : ${params.company.rccm}`
      : "",
  ].filter(Boolean);

  const clientLines = params.clientLines;

  const clientLegalBits = [
    params.clientNif ? `NIF : ${params.clientNif}` : "",
    params.clientRccm ? `RCCM : ${params.clientRccm}` : "",
    params.clientCnss ? `CNSS : ${params.clientCnss}` : "",
    params.clientCnamgs ? `CNAMGS : ${params.clientCnamgs}` : "",
  ].filter(Boolean);

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#334155;">
      Bonjour <strong style="color:#0F172A;">${escapeHtml(params.contactName || params.clientName)}</strong>,
    </p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#334155;">
      Veuillez trouver ci-dessous le détail de votre
      <strong style="color:#0F172A;">${escapeHtml(params.typeLabel.toLowerCase())}</strong>
      n° <strong style="color:#0F172A;">${escapeHtml(params.number)}</strong>
      ${params.type === "invoice" ? "(PDF joint)." : "— valable selon les conditions indiquées (PDF joint)."}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td width="48%" valign="top" style="padding-right:8px;">
          <div style="background:#F1F5F9;border-radius:10px;padding:14px 16px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748B;">Émetteur</div>
            <div style="margin-top:6px;font-size:14px;font-weight:600;color:#0F172A;">${escapeHtml(params.company.name)}</div>
            ${emitterLines
              .map(
                (l) =>
                  `<div style="font-size:12px;line-height:1.45;color:#475569;">${escapeHtml(l)}</div>`,
              )
              .join("")}
            ${
              emitterLegalBits.length
                ? `<div style="margin-top:8px;font-size:11px;line-height:1.45;color:#64748B;">${escapeHtml(emitterLegalBits.join(" · "))}</div>`
                : ""
            }
          </div>
        </td>
        <td width="52%" valign="top" style="padding-left:8px;">
          <div style="background:#F1F5F9;border-radius:10px;padding:14px 16px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748B;">Client</div>
            <div style="margin-top:6px;font-size:14px;font-weight:600;color:#0F172A;">${escapeHtml(params.clientName)}</div>
            ${clientLines
              .map(
                (l) =>
                  `<div style="font-size:12px;line-height:1.45;color:#475569;">${escapeHtml(l)}</div>`,
              )
              .join("")}
            ${
              clientLegalBits.length
                ? `<div style="margin-top:8px;font-size:11px;line-height:1.45;color:#64748B;">${escapeHtml(clientLegalBits.join(" · "))}</div>`
                : ""
            }
          </div>
        </td>
      </tr>
    </table>

    <div style="margin-bottom:16px;font-size:12px;color:#475569;">
      <span>Date d'échéance : <strong style="color:#0F172A;">${escapeHtml(params.dueDate || params.issueDate)}</strong></span>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #E2E8F0;">
      <thead>
        <tr style="background:linear-gradient(90deg, ${accent}, ${accentTo});color:#FFFFFF;">
          <th style="text-align:left;padding:11px 12px;font-size:12px;font-weight:600;letter-spacing:0.03em;">Description</th>
          <th style="text-align:right;padding:11px 12px;font-size:12px;font-weight:600;">Qté</th>
          <th style="text-align:right;padding:11px 12px;font-size:12px;font-weight:600;">P.U.</th>
          <th style="text-align:right;padding:11px 12px;font-size:12px;font-weight:600;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td></td>
        <td width="280" valign="top">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:8px 12px;color:#64748B;font-size:13px;background:#FFFFFF;">Sous-total</td>
              <td style="padding:8px 12px;text-align:right;font-size:13px;background:#FFFFFF;">${escapeHtml(money(params.subtotal, params.currency))}</td>
            </tr>
            ${taxRows}
            <tr>
              <td style="padding:12px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#FFFFFF;background:linear-gradient(90deg, ${accent}, ${accentTo});">Total TTC</td>
              <td style="padding:12px;text-align:right;font-size:14px;font-weight:700;color:#FFFFFF;background:linear-gradient(90deg, ${accent}, ${accentTo});">${escapeHtml(money(params.total, params.currency))}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${
      params.type === "invoice" && (params.company.bankName || params.company.bankAccount)
        ? `<div style="margin-top:20px;background:#F1F5F9;border-radius:10px;padding:12px 14px;font-size:12px;color:#475569;">
            <strong style="color:#0F172A;">RIB pour le règlement</strong>
            ${params.company.bankName ? `<div style="margin-top:4px;">Banque : ${escapeHtml(params.company.bankName)}</div>` : ""}
            ${params.company.bankAccount ? `<div>RIB : ${escapeHtml(params.company.bankAccount)}</div>` : ""}
          </div>`
        : ""
    }

    ${
      params.notes
        ? `<div style="margin-top:20px;background:#F8FAFC;border-radius:10px;padding:12px 14px;font-size:13px;color:#475569;"><strong style="color:#0F172A;">Notes :</strong> ${escapeHtml(params.notes)}</div>`
        : ""
    }

    <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#334155;">
      Cordialement,<br/>
      <strong style="color:${accent};">${escapeHtml(params.company.name)}</strong>
    </p>
  `;

  return emailShell({
    accent: colors,
    company: params.company,
    typeTitle: params.typeLabel,
    number: params.number,
    issueDate: params.issueDate,
    bodyHtml,
    niuLabel: params.niuLabel,
  });
}

function buildLetterEmailHtml(params: {
  company: CompanyInfo;
  number: string;
  subject: string;
  placeDate: string;
  recipientBlock: string;
  salutation: string;
  body: string;
  closing: string;
  signatoryTitle: string;
  managerName: string;
  niuLabel: string;
  cabinet?: "conseil" | "expertise_fiscale";
}): string {
  const colors = DOCUMENT_COLORS.letter;
  const { accent } = colors;
  const signatureUrl = params.company.stampUrl?.trim() || "";
  const sigW = params.cabinet === "conseil" ? 320 : 380;
  const sigH = params.cabinet === "conseil" ? 192 : 240;

  const recipientHtml = escapeHtml(
    params.recipientBlock || "Destinataire",
  ).replace(/\n/g, "<br/>");

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td></td>
        <td width="52%" align="right" style="font-size:13px;color:#475569;line-height:1.5;">
          ${escapeHtml(params.placeDate)}
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 22px;">
      <tr>
        <td></td>
        <td width="54%" valign="top">
          <div style="border-left:3px solid ${accent};padding:10px 14px;background:#F8FAFC;border-radius:0 10px 10px 0;font-size:13.5px;line-height:1.55;color:#0F172A;">
            ${recipientHtml}
          </div>
        </td>
      </tr>
    </table>

    <div style="margin-bottom:18px;padding:14px 16px;background:#F1F5F9;border-radius:10px;">
      <div style="font-size:13px;color:#0F172A;line-height:1.55;">
        <span style="font-weight:700;color:${accent};">REF :</span> ${escapeHtml(params.number)}
      </div>
      <div style="margin-top:6px;font-size:13px;color:#0F172A;line-height:1.55;">
        <span style="font-weight:700;color:${accent};">Objet :</span> ${escapeHtml(params.subject)}
      </div>
    </div>

    ${
      params.salutation
        ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#0F172A;">${escapeHtml(params.salutation)}</p>`
        : ""
    }

    <div style="font-size:14px;line-height:1.8;color:#1E293B;white-space:pre-line;text-align:justify;">
${escapeHtml(params.body)}
    </div>

    ${
      params.closing
        ? `<div style="margin-top:24px;font-size:14px;line-height:1.75;color:#1E293B;white-space:pre-line;">${escapeHtml(params.closing)}</div>`
        : ""
    }

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:36px;">
      <tr>
        <td></td>
        <td width="380" align="right" style="padding:12px 0 12px 20px;">
          ${
            signatureUrl
              ? `<div><img src="${escapeHtml(signatureUrl)}" alt="Signature" width="${sigW}" height="${sigH}" style="width:${sigW}px;height:${sigH}px;max-width:${sigW}px;object-fit:contain;object-position:right center;display:block;margin-left:auto;" /></div>`
              : ""
          }
          ${
            params.managerName
              ? `<div style="margin-top:2px;padding-right:8px;font-size:14px;font-weight:600;color:#0F172A;text-align:right;">${escapeHtml(params.managerName)}</div>`
              : `<div style="margin-top:4px;font-size:12px;font-style:italic;color:#94A3B8;">Signé</div>`
          }
        </td>
      </tr>
    </table>
  `;

  return emailShell({
    accent: colors,
    company: params.company,
    typeTitle: "Courriel",
    number: params.number,
    bodyHtml,
    niuLabel: params.niuLabel,
  });
}

function lineAmount(quantity: number, unitPrice: number, discount: number) {
  return quantity * unitPrice * (1 - (discount || 0) / 100);
}

export const sendDocumentEmail = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      pdfBase64: z.string().optional(),
      fileName: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff } = session;
    requireResendApiKey();

    const doc = await prisma.document.findFirst({
      where: isSuperAdmin(staff.role)
        ? { id: data.id }
        : { id: data.id, cabinet: session.activeCabinet },
      include: {
        lines: { orderBy: { position: "asc" } },
        client: true,
      },
    });
    if (!doc) throw new Error("Document introuvable");
    if (!canWriteDocument(staff.role, staff.id, doc.createdById)) {
      throw new Error("Accès refusé — document en lecture seule");
    }
    if (
      doc.type === "letter" ||
      doc.type === "invoice" ||
      doc.type === "quotation"
    ) {
      if (doc.status !== "signed" && doc.status !== "sent") {
        throw new Error(
          "Le document doit être signé par un administrateur avant l'envoi (ou imprimé en PDF pour signature physique).",
        );
      }
    }
    if (doc.mailMergeCampaignId) {
      if (!isAdmin(staff.role)) {
        throw new Error("Envoi du publipostage réservé aux administrateurs");
      }
    }
    if (!doc.client) throw new Error("Client introuvable");
    if (!doc.client.email?.trim()) {
      throw new Error(`Le client « ${doc.client.name} » n'a pas d'adresse email`);
    }

    const companyRow = await prisma.company.findUnique({
      where: { cabinet: doc.cabinet },
    });
    const company = companyForPreview(companyRow, doc.cabinet);
    const { from, replyTo } = resolveCabinetMailAddresses(company);
    const typeLabel = documentTypeLabel(doc.type as DocumentType);
    const to = doc.client.email.trim();
    const managerCc = resolveManagerCc(company, to);
    const niuLabel = niuLabelForCabinet(doc.cabinet);

    let subject: string;
    let html: string;

    if (doc.type === "letter") {
      subject = doc.subject?.trim() || `${typeLabel} ${doc.number}`;
      const letterBody = [doc.body].filter(Boolean).join("\n\n");
      const city = (company.city.split(",")[0] || company.city).trim();
      const recipientBlock = doc.recipientOverride?.trim()
        ? doc.recipientOverride.trim()
        : clientLetterRecipientLines(doc.client).join("\n");

      html = buildLetterEmailHtml({
        company,
        number: doc.number,
        subject,
        placeDate: `${city}, le ${formatDate(doc.issueDate)}.`,
        recipientBlock,
        salutation: doc.salutation?.trim() || "",
        body: letterBody || "Veuillez trouver notre courrier ci-joint.",
        closing: doc.closing ?? "",
        signatoryTitle: doc.signatoryTitle || staff.jobTitle,
        managerName: company.managerName?.trim() || "",
        niuLabel,
        cabinet: doc.cabinet,
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
        company,
        type: doc.type as "invoice" | "quotation",
        typeLabel,
        number: doc.number,
        clientName: clientDisplayName(doc.client),
        contactName: clientRepresentativeLine(doc.client) || doc.client.contactName,
        clientLines: clientDocumentLines(doc.client),
        clientNif: doc.client.nif || undefined,
        clientRccm: doc.client.rccm || undefined,
        clientCnss: doc.client.cnss || undefined,
        clientCnamgs: doc.client.cnamgs || undefined,
        issueDate: formatDate(doc.issueDate),
        dueDate: doc.dueDate ? formatDate(doc.dueDate) : null,
        currency,
        lines,
        subtotal: Number(doc.subtotal),
        tps: Number(doc.tps),
        css: Number(doc.css),
        vat: Number(doc.vat),
        total: Number(doc.total),
        notes: doc.notes,
        niuLabel,
      });
    }

    const pdfFileName =
      data.fileName?.trim() ||
      `${doc.number.replace(/[^\w.\-]+/g, "_")}.pdf`;
    let pdfTraceUrl: string | null = null;

    if (data.pdfBase64) {
      try {
        const raw = Buffer.from(data.pdfBase64, "base64");
        if (raw.byteLength <= 12 * 1024 * 1024) {
          const { uploadDocumentPdfBytes } = await import(
            "@/lib/document-pdf-storage"
          );
          const uploaded = await uploadDocumentPdfBytes({
            cabinet: doc.cabinet,
            documentId: doc.id,
            action: "email",
            fileName: pdfFileName,
            bytes: raw,
          });
          await prisma.documentPdfTrace.create({
            data: {
              documentId: doc.id,
              cabinet: doc.cabinet,
              action: "email",
              fileName: pdfFileName,
              fileUrl: uploaded.fileUrl,
              staffId: staff.id,
            },
          });
          pdfTraceUrl = uploaded.fileUrl;
        }
      } catch (err) {
        console.warn("[sendDocumentEmail] trace PDF", err);
      }
    }

    const resend = getResend();
    const attachments =
      data.pdfBase64
        ? [
            {
              filename: pdfFileName.endsWith(".pdf")
                ? pdfFileName
                : `${pdfFileName}.pdf`,
              content: Buffer.from(data.pdfBase64, "base64"),
            },
          ]
        : undefined;

    const { data: sent, error } = await resend.emails.send({
      from,
      to,
      ...(managerCc ? { cc: [managerCc] } : {}),
      subject,
      html,
      ...(replyTo ? { replyTo: [replyTo] } : {}),
      ...(attachments ? { attachments } : {}),
    });

    if (error) {
      console.error("[sendDocumentEmail]", doc.number, to, error);
      throw new Error(resendErrorMessage(error));
    }

    await logOutboundMail({
      cabinet: doc.cabinet,
      resendId: sent?.id ?? null,
      fromEmail: from,
      toEmail: to,
      ccEmail: managerCc ?? null,
      subject,
      html,
      documentId: doc.id,
      clientId: doc.clientId,
      staffId: staff.id,
      lastEvent: "sent",
    });

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
      pdfUrl: pdfTraceUrl,
    };
  });
