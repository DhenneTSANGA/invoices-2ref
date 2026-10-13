import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session.functions";
import { getResend } from "@/lib/resend";
import { companyForPreview } from "@/lib/company-defaults";
import {
  DOCUMENT_COLORS,
  niuLabelForCabinet,
  CONSEIL_LEGAL_FOOTER,
  CONSEIL_PAPER_COLORS,
} from "@/lib/cabinets";
import { signatoryDisplayName } from "@/lib/signatory";
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
import { number as formatAmount } from "@/lib/format";
import { canWriteDocument, isAdmin, isSuperAdmin } from "@/lib/roles";
import { recordAdminSignature } from "@/lib/letter-signature.functions";
import { loadDocumentPoles } from "@/lib/client-pole-db";
import { assertMemberCanAccessPole } from "@/lib/staff-pole";
import { parseClientPole } from "@/lib/client-pole";
import type { CompanyInfo, DocumentType } from "@/store/types";
import { logOutboundMail } from "@/lib/mail-log";
import {
  clientLetterRecipientLines,
  clientDisplayName,
  clientDocumentLines,
  clientConseilDocumentLines,
} from "@/lib/client-address";
import {
  isRichTextEmpty,
  richOrPlainToEmailHtml,
} from "@/lib/rich-text";
import { letterPlaceCityLabel } from "@/lib/letter-place-city";
import { loadLineQuantityUnits } from "@/lib/document-line-quantity-db";
import { parseLineQuantityUnit } from "@/lib/line-quantity";
import { loadTotalRounding } from "@/lib/document-total-rounding-db";
import { loadDeposits } from "@/lib/document-deposit-db";
import { remainingDue, normalizedDeposit, computeDocumentTotals } from "@/lib/document-math";
import {
  loadDiscountChoices,
  loadLineBillingKinds,
} from "@/lib/document-funds-db";
import type { LineItem } from "@/store/types";

async function requireSession() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  return session;
}

function money(n: number | { toNumber?: () => number } | string) {
  const value =
    typeof n === "number"
      ? n
      : typeof n === "string"
        ? Number(n)
        : typeof n?.toNumber === "function"
          ? n.toNumber()
          : Number(n);
  return formatAmount(Number.isFinite(value) ? value : 0);
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
  legalText?: string;
}): string {
  const { accent, accentTo } = params.accent;
  const c = params.company;
  const niuLabel = params.niuLabel ?? "NIU";
  const legalBits = [
    c.capital?.trim() || c.tagline,
    [c.address, c.city].filter(Boolean).join(", "),
    c.rccm && c.rccm !== "—" ? `RCCM : ${c.rccm}` : "",
    c.nif && c.nif !== "—" ? `NIF : ${c.nif}` : "",
    c.niu && c.niu !== "—" ? `${niuLabel} : ${c.niu}` : "",
    c.phone ? `Tél. : ${c.phone}` : "",
    c.email,
  ].filter(Boolean);
  const footerLegal = params.legalText
    ? `<div style="text-align:justify;text-align-last:center;line-height:1.45;">${escapeHtml(params.legalText)}</div>`
    : escapeHtml(legalBits.join(" · "));

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
                ${footerLegal}
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

/** « Bonjour Monsieur Dupont, » — civilité renseignée sur la fiche client. */
function emailGreeting(civility: string | null | undefined, contactName: string): string {
  const civ = civility === "Monsieur" || civility === "Madame" ? civility : "";
  const name = contactName.trim();
  if (civ && name) return `Bonjour ${civ} ${name},`;
  if (civ) return `Bonjour ${civ},`;
  if (name) return `Bonjour ${name},`;
  return "Bonjour Madame, Monsieur,";
}

export const DOCUMENT_PREVIEW_CID = "document-preview";

function buildCommercialEmailHtml(params: {
  company: CompanyInfo;
  type: "invoice" | "quotation";
  typeLabel: string;
  number: string;
  greeting: string;
  clientName: string;
  clientLines: string[];
  clientNif?: string;
  clientPhone?: string;
  clientRccm?: string;
  clientCnss?: string;
  clientCnamgs?: string;
  issueDate: string;
  dueDate?: string | null;
  currency: string;
  total: number;
  deposit?: number;
  niuLabel: string;
  cabinet?: "conseil" | "expertise_fiscale";
  /** Image de la facture intégrée au corps (cid). */
  hasPreviewImage: boolean;
  /** Lien public du PDF (téléchargement ultérieur). */
  pdfUrl?: string | null;
}): string {
  const isConseil = params.cabinet === "conseil";
  const accent = isConseil
    ? CONSEIL_PAPER_COLORS.accent
    : DOCUMENT_COLORS[params.type].accent;
  const typeLower = params.typeLabel.toLowerCase();
  const c = params.company;

  const emitterLines = isConseil
    ? [c.address, c.city, c.phone, c.email, c.website].filter(Boolean)
    : [
        c.capital,
        c.address,
        c.city,
        [c.phone, c.email].filter(Boolean).join(" · "),
      ].filter(Boolean);

  const emitterLegalBits = isConseil
    ? []
    : [
        c.nif && c.nif !== "—" ? `NIF : ${c.nif}` : "",
        c.niu && c.niu !== "—" ? `${params.niuLabel} : ${c.niu}` : "",
        c.rccm && c.rccm !== "—" ? `RCCM : ${c.rccm}` : "",
      ].filter(Boolean);

  const clientLegalBits = [
    params.clientNif ? `NIF : ${params.clientNif}` : "",
    isConseil && !params.clientNif && params.clientPhone ? params.clientPhone : "",
    !isConseil && params.clientRccm ? `RCCM : ${params.clientRccm}` : "",
    params.clientCnss ? `CNSS : ${params.clientCnss}` : "",
    params.clientCnamgs ? `CNAMGS : ${params.clientCnamgs}` : "",
  ].filter(Boolean);

  const card = (title: string, name: string, lines: string[], legal: string[]) => `
    <div style="background:#F1F5F9;border-radius:10px;padding:14px 16px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748B;">${title}</div>
      <div style="margin-top:6px;font-size:14px;font-weight:600;color:#0F172A;">${escapeHtml(name)}</div>
      ${lines.map((l) => `<div style="font-size:12px;line-height:1.45;color:#475569;">${escapeHtml(l)}</div>`).join("")}
      ${legal.map((l) => `<div style="font-size:11px;line-height:1.45;color:#64748B;">${escapeHtml(l)}</div>`).join("")}
    </div>`;

  const deposit = normalizedDeposit(params.deposit);
  const due = remainingDue(params.total, deposit);
  const summaryRow = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:6px 0;font-size:13px;color:#64748B;">${escapeHtml(label)}</td><td style="padding:6px 0;text-align:right;font-size:13px;${strong ? "font-weight:700;color:#0F172A;" : "color:#0F172A;"}">${escapeHtml(value)}</td></tr>`;

  const previewHtml = params.hasPreviewImage
    ? `<div style="margin-top:24px;">
        <img src="cid:${DOCUMENT_PREVIEW_CID}" alt="${escapeHtml(`${params.typeLabel} n° ${params.number}`)}" width="584" style="display:block;width:100%;max-width:584px;height:auto;border:1px solid #E2E8F0;border-radius:6px;" />
      </div>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #E2E8F0;border-bottom:1px solid #E2E8F0;">
        ${summaryRow("Date", params.issueDate)}
        ${params.dueDate ? summaryRow("Date d'échéance", params.dueDate) : ""}
        ${summaryRow("Montant TTC", `${money(params.total)} ${params.currency}`, deposit <= 0)}
        ${deposit > 0 ? summaryRow("Reste à payer", `${money(due)} ${params.currency}`, true) : ""}
      </table>`;

  const pdfLinkHtml = params.pdfUrl
    ? `<p style="margin:20px 0 0;">
        <a href="${escapeHtml(params.pdfUrl)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:${accent};color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;">Télécharger le PDF</a>
      </p>`
    : "";

  const legal = isConseil
    ? CONSEIL_LEGAL_FOOTER
    : [
        c.capital?.trim() || c.tagline,
        [c.address, c.city].filter(Boolean).join(", "),
        c.rccm && c.rccm !== "—" ? `RCCM : ${c.rccm}` : "",
        c.nif && c.nif !== "—" ? `NIF : ${c.nif}` : "",
      ]
        .filter(Boolean)
        .join(" · ");

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#0F172A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
          <tr>
            <td style="padding:0 28px;font-size:14px;line-height:1.7;color:#334155;">
              <p style="margin:0 0 14px;">${escapeHtml(params.greeting)}</p>
              <p style="margin:0 0 20px;">
                Veuillez trouver ci-dessous le détail de votre
                <strong style="color:#0F172A;">${escapeHtml(typeLower)}</strong>
                n° <strong style="color:#0F172A;">${escapeHtml(params.number)}</strong> (PDF joint).
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" valign="top" style="padding-right:8px;">
                    ${card("Émetteur", c.name, emitterLines, emitterLegalBits)}
                  </td>
                  <td width="52%" valign="top" style="padding-left:8px;">
                    ${card("Client", params.clientName, params.clientLines, clientLegalBits)}
                  </td>
                </tr>
              </table>

              ${previewHtml}
              ${pdfLinkHtml}

              <p style="margin:24px 0 0;">
                Pour toute question, il vous suffit de répondre directement à cet e-mail.
              </p>
              <p style="margin:16px 0 0;">
                Cordialement,<br/>
                <strong style="color:${accent};">${escapeHtml(c.name)}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 0;">
              <div style="border-top:1px solid #E2E8F0;padding-top:12px;font-size:11px;line-height:1.55;color:#94A3B8;text-align:center;">
                ${escapeHtml(legal)}
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
      !isRichTextEmpty(params.salutation)
        ? `<div style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#0F172A;">${richOrPlainToEmailHtml(params.salutation)}</div>`
        : ""
    }

    <div style="font-size:14px;line-height:1.8;color:#1E293B;text-align:justify;">
${richOrPlainToEmailHtml(params.body)}
    </div>

    ${
      !isRichTextEmpty(params.closing)
        ? `<div style="margin-top:24px;font-size:14px;line-height:1.75;color:#1E293B;">${richOrPlainToEmailHtml(params.closing)}</div>`
        : ""
    }

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:36px;">
      <tr>
        <td></td>
        <td width="380" align="center" style="padding:12px 0;">
          ${
            signatureUrl
              ? `<div style="text-align:center;"><img src="${escapeHtml(signatureUrl)}" alt="Signature" width="${sigW}" height="${sigH}" style="width:${sigW}px;height:${sigH}px;max-width:${sigW}px;object-fit:contain;object-position:center;display:block;margin:0 auto;" /></div>`
              : ""
          }
          ${
            params.managerName
              ? `<div style="margin-top:2px;font-size:14px;font-weight:600;color:#0F172A;text-align:center;">${escapeHtml(params.managerName)}</div>`
              : `<div style="margin-top:4px;font-size:12px;font-style:italic;color:#94A3B8;text-align:center;">Signé</div>`
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

type MailStaff = {
  id: string;
  role: "member" | "admin" | "super_admin";
  jobTitle: string;
  firstName: string;
  lastName: string;
  pole?: import("@/lib/client-pole").ClientPole | null;
};

/** Envoi e-mail document (UI ou tâches planifiées). */
export async function sendDocumentEmailInternal(params: {
  documentId: string;
  staff: MailStaff;
  pdfBase64?: string;
  fileName?: string;
  /** Aperçu JPEG de la facture / du devis, intégré au corps du mail. */
  previewImageBase64?: string;
  skipAccessCheck?: boolean;
  activeCabinet?: "conseil" | "expertise_fiscale";
}) {
  requireResendApiKey();

  const doc = await prisma.document.findFirst({
    where: { id: params.documentId },
    include: {
      lines: { orderBy: { position: "asc" } },
      client: true,
    },
  });
  if (!doc) throw new Error("Document introuvable");
  const superAdmin = isSuperAdmin(params.staff.role);
  const cabinetAdmin =
    !superAdmin &&
    isAdmin(params.staff.role) &&
    (!params.activeCabinet || doc.cabinet === params.activeCabinet);
  if (!params.skipAccessCheck && !superAdmin) {
    if (params.activeCabinet && doc.cabinet !== params.activeCabinet) {
      throw new Error("Ce document appartient à un autre cabinet");
    }
    const mailPoles = await loadDocumentPoles([doc.id]);
    assertMemberCanAccessPole(
      params.staff,
      mailPoles.get(doc.id) ?? parseClientPole(undefined),
    );
    if (!canWriteDocument(params.staff.role, params.staff.id, doc.createdById)) {
      throw new Error("Accès refusé — document en lecture seule");
    }
  }
    if (
      doc.type === "letter" ||
      doc.type === "invoice" ||
      doc.type === "quotation"
    ) {
      if (doc.status === "cancelled") {
        throw new Error("Document annulé");
      }
      const sendable =
        doc.status === "signed" ||
        doc.status === "sent" ||
        doc.status === "paid";
      if (!sendable && (superAdmin || cabinetAdmin) && doc.status === "draft") {
        const companyRow = await prisma.company.findUnique({
          where: { cabinet: doc.cabinet },
        });
        const company = companyForPreview(companyRow, doc.cabinet);
        if (!company.managerName?.trim()) {
          throw new Error(
            "Configurez le nom du gérant dans Paramètres avant de signer.",
          );
        }
        await recordAdminSignature({
          documentId: doc.id,
          cabinet: doc.cabinet,
          staffId: params.staff.id,
          note: superAdmin
            ? "Signature du super administrateur à l’envoi"
            : "Signature de l’administrateur à l’envoi",
        });
        doc.status = "signed";
      } else if (!sendable) {
        throw new Error(
          "Le document doit être signé par un administrateur avant l'envoi (ou imprimé en PDF pour signature physique).",
        );
      }
    }
  if (doc.mailMergeCampaignId) {
    if (!isAdmin(params.staff.role)) {
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

  const pdfFileName =
    params.fileName?.trim() ||
    `${doc.number.replace(/[^\w.\-]+/g, "_")}.pdf`;
  let pdfTraceUrl: string | null = null;

  if (params.pdfBase64) {
    try {
      const raw = Buffer.from(params.pdfBase64, "base64");
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
            staffId: params.staff.id,
          },
        });
        pdfTraceUrl = uploaded.fileUrl;
      }
    } catch (err) {
      console.warn("[sendDocumentEmail] trace PDF", err);
    }
  }

  const previewImage =
    doc.type !== "letter" && params.previewImageBase64
      ? Buffer.from(params.previewImageBase64, "base64")
      : null;
  const hasPreviewImage = Boolean(
    previewImage && previewImage.byteLength > 0 && previewImage.byteLength <= 3 * 1024 * 1024,
  );

    let subject: string;
    let html: string;

    if (doc.type === "letter") {
      subject = doc.subject?.trim() || `${typeLabel} ${doc.number}`;
      const letterBody = [doc.body].filter(Boolean).join("\n\n");
      const city = letterPlaceCityLabel(doc.placeCity, company.city);
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
        signatoryTitle: doc.signatoryTitle || params.staff.jobTitle,
        managerName: signatoryDisplayName(doc.signatoryTitle),
        niuLabel,
        cabinet: doc.cabinet,
      });
    } else {
      const currency = doc.currency || "XAF";
      const roundingFlags = await loadTotalRounding([doc.id]);
      const rounding = roundingFlags.get(doc.id) ?? 0;
      const depositFlags = await loadDeposits([doc.id]);
      const deposit = depositFlags.get(doc.id) ?? 0;
      const quantityUnits = await loadLineQuantityUnits(doc.lines.map((l) => l.id));
      const billingKinds = await loadLineBillingKinds(doc.lines.map((l) => l.id));
      const discountChoices = await loadDiscountChoices([doc.id]);
      const discountChoice = discountChoices.get(doc.id);
      const mathItems: LineItem[] = doc.lines.map((l) => ({
        id: l.id,
        description: l.description,
        quantity: Number(l.quantity),
        quantityUnit: parseLineQuantityUnit(quantityUnits.get(l.id)),
        billingKind: billingKinds.get(l.id) ?? "service",
        unitPrice: Number(l.unitPrice),
        vatRate: Number(l.vatRate),
        discount: 0,
        tpsRate: Number(l.tpsRate),
        cssRate: Number(l.cssRate),
      }));
      const totals = computeDocumentTotals(mathItems, {
        discount: Number(doc.discount),
        discountMode: discountChoice?.mode ?? "percent",
        discountFixed: discountChoice?.fixed ?? 0,
        rounding,
      });
      const useComputed = totals.hasFunds || discountChoice?.mode === "amount";
      subject = `${typeLabel} ${doc.number} — ${company.name}`;
      html = buildCommercialEmailHtml({
        company,
        type: doc.type as "invoice" | "quotation",
        typeLabel,
        number: doc.number,
        greeting: emailGreeting(doc.client.civility, doc.client.contactName),
        clientName: clientDisplayName(doc.client),
        clientLines:
          doc.cabinet === "conseil"
            ? clientConseilDocumentLines(doc.client)
            : clientDocumentLines(doc.client),
        clientNif: doc.client.nif || undefined,
        clientPhone: doc.client.phone || undefined,
        clientRccm: doc.client.rccm || undefined,
        clientCnss: doc.client.cnss || undefined,
        clientCnamgs: doc.client.cnamgs || undefined,
        issueDate: formatDate(doc.issueDate),
        dueDate: doc.dueDate ? formatDate(doc.dueDate) : null,
        currency,
        total: useComputed ? totals.total : Math.max(0, Number(doc.total)),
        deposit,
        niuLabel,
        cabinet: doc.cabinet,
        hasPreviewImage,
        pdfUrl: pdfTraceUrl,
      });
    }

  const resend = getResend();
  const attachments = [
    ...(params.pdfBase64
      ? [
          {
            filename: pdfFileName.endsWith(".pdf")
              ? pdfFileName
              : `${pdfFileName}.pdf`,
            content: Buffer.from(params.pdfBase64, "base64"),
          },
        ]
      : []),
    ...(hasPreviewImage && previewImage
      ? [
          {
            filename: `apercu-${pdfFileName.replace(/\.pdf$/i, "")}.jpg`,
            content: previewImage,
            contentType: "image/jpeg",
            contentId: DOCUMENT_PREVIEW_CID,
          },
        ]
      : []),
  ];

  const { data: sent, error } = await resend.emails.send({
      from,
      to,
      ...(managerCc ? { cc: [managerCc] } : {}),
      subject,
      html,
      ...(replyTo ? { replyTo: [replyTo] } : {}),
      ...(attachments.length ? { attachments } : {}),
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
    html: html.replace(
      new RegExp(`<img src="cid:${DOCUMENT_PREVIEW_CID}"[^>]*/>`),
      `<p style="font-size:12px;font-style:italic;color:#64748B;">[Aperçu du document intégré au mail]</p>`,
    ),
    documentId: doc.id,
    clientId: doc.clientId,
    staffId: params.staff.id,
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
      actorStaffId: params.staff.id,
      actorName: staffDisplayName(params.staff),
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
}

export const sendDocumentEmail = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      pdfBase64: z.string().optional(),
      fileName: z.string().optional(),
      previewImageBase64: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    return sendDocumentEmailInternal({
      documentId: data.id,
      staff: session.staff,
      pdfBase64: data.pdfBase64,
      fileName: data.fileName,
      previewImageBase64: data.previewImageBase64,
      activeCabinet: session.activeCabinet,
    });
  });
