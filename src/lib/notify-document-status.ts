import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  documentStatusLabel,
  documentTypeLabel,
  notificationTypeForStatus,
} from "@/lib/document-status-labels";
import { CABINET_LABELS } from "@/lib/cabinets";
import { escapeHtml, formatFrom, resendErrorMessage } from "@/lib/email";
import { currency as formatCurrency } from "@/lib/format";
import type { DocumentStatus, DocumentType } from "@/store/types";

type BroadcastArgs = {
  actorStaffId: string;
  actorName: string;
  documentId: string;
  documentNumber: string;
  documentType: DocumentType;
  previousStatus: DocumentStatus;
  nextStatus: DocumentStatus;
};

function documentPath(type: DocumentType, id: string): string {
  switch (type) {
    case "invoice":
      return `/invoices/${id}`;
    case "quotation":
      return `/quotations/${id}`;
    case "proforma":
      return `/proformas/${id}`;
    case "letter":
      return `/lettre/${id}`;
    default:
      return `/documents`;
  }
}

function appBaseUrl(): string | null {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.VITE_APP_URL?.trim() ||
    process.env.SITE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/**
 * Notifie les collaborateurs (in-app).
 * Si le statut passe à « payé », envoie aussi un e-mail aux admins du cabinet + super admins.
 * @returns info optionnelle sur l'envoi e-mail (pour toast UI)
 */
export async function broadcastDocumentStatusChange(
  args: BroadcastArgs,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ emailSent?: boolean; emailError?: string; emailRecipients?: number }> {
  if (args.previousStatus === args.nextStatus) return {};

  const doc = await db.document.findUnique({
    where: { id: args.documentId },
    select: {
      cabinet: true,
      total: true,
      currency: true,
      client: { select: { name: true } },
    },
  });
  if (!doc) return {};

  const recipients = await db.staffMember.findMany({
    where: {
      id: { not: args.actorStaffId },
      OR: [{ cabinet: doc.cabinet }, { role: "super_admin" }],
    },
    select: { id: true },
  });

  if (recipients.length > 0) {
    const typeLabel = documentTypeLabel(args.documentType);
    const prevLabel = documentStatusLabel(args.previousStatus);
    const nextLabel = documentStatusLabel(args.nextStatus);
    const notifType = notificationTypeForStatus(args.nextStatus);

    await db.notification.createMany({
      data: recipients.map((r) => ({
        staffId: r.id,
        documentId: args.documentId,
        title: `${typeLabel} ${args.documentNumber} — ${nextLabel}`,
        body: `${args.actorName} a mis à jour le statut : ${prevLabel} → ${nextLabel}`,
        type: notifType,
      })),
    });
  }

  if (args.nextStatus !== "paid") return {};

  // Attendre l'envoi pour ne pas perdre l'appel en fin de requête serveur
  return notifyAdminsDocumentPaid({
    ...args,
    cabinet: doc.cabinet,
    clientName: doc.client?.name ?? "Client",
    total: Number(doc.total),
    currency: doc.currency || "XAF",
  });
}

async function notifyAdminsDocumentPaid(args: {
  actorStaffId: string;
  actorName: string;
  documentId: string;
  documentNumber: string;
  documentType: DocumentType;
  previousStatus: DocumentStatus;
  cabinet: "conseil" | "expertise_fiscale";
  clientName: string;
  total: number;
  currency: string;
}): Promise<{ emailSent?: boolean; emailError?: string; emailRecipients?: number }> {
  const admins = await prisma.staffMember.findMany({
    where: {
      id: { not: args.actorStaffId },
      OR: [
        { role: "super_admin" },
        { role: "admin", cabinet: args.cabinet },
      ],
    },
    select: { email: true, firstName: true },
  });

  const emails = [
    ...new Set(
      admins
        .map((a) => a.email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (emails.length === 0) {
    return {
      emailSent: false,
      emailRecipients: 0,
      emailError:
        "Aucun admin / super admin destinataire (hors auteur du changement)",
    };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !fromEmail) {
    const msg =
      "RESEND_API_KEY / RESEND_FROM_EMAIL manquants — e-mail d'alerte non envoyé";
    console.warn("[notifyAdminsDocumentPaid]", msg);
    return { emailSent: false, emailRecipients: emails.length, emailError: msg };
  }

  const { getResend } = await import("@/lib/resend");
  const resend = getResend();

  const typeLabel = documentTypeLabel(args.documentType);
  const cabinetLabel = CABINET_LABELS[args.cabinet];
  const prevLabel = documentStatusLabel(args.previousStatus);
  const amount = formatCurrency(args.total, args.currency);

  const base = appBaseUrl();
  const path = documentPath(args.documentType, args.documentId);
  const link = base ? `${base}${path}` : path;

  const subject = `${typeLabel} ${args.documentNumber} marquée payée — ${cabinetLabel}`;
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:560px">
      <p style="margin:0 0 12px;font-size:14px;color:#64748b">${escapeHtml(cabinetLabel)}</p>
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:700">
        Document payé
      </h1>
      <p style="margin:0 0 12px">
        <strong>${escapeHtml(args.actorName)}</strong> a marqué
        <strong>${escapeHtml(typeLabel)} ${escapeHtml(args.documentNumber)}</strong>
        comme <strong>payé</strong>
        (précédemment : ${escapeHtml(prevLabel)}).
      </p>
      <ul style="margin:0 0 16px;padding-left:18px;font-size:14px">
        <li>Client : ${escapeHtml(args.clientName)}</li>
        <li>Montant : ${escapeHtml(amount)}</li>
        <li>Cabinet : ${escapeHtml(cabinetLabel)}</li>
      </ul>
      <p style="margin:0">
        <a href="${escapeHtml(link)}"
           style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-size:14px;font-weight:600">
          Voir le document
        </a>
      </p>
    </div>
  `.trim();

  const from = formatFrom(cabinetLabel, fromEmail);
  const { error } = await resend.emails.send({
    from,
    to: emails,
    subject,
    html,
  });

  if (error) {
    const msg = resendErrorMessage(error);
    console.error(
      "[notifyAdminsDocumentPaid] Resend",
      args.documentNumber,
      emails.length,
      "destinataire(s)",
      msg,
    );
    return { emailSent: false, emailRecipients: emails.length, emailError: msg };
  }

  return { emailSent: true, emailRecipients: emails.length };
}

export function staffDisplayName(staff: {
  firstName: string;
  lastName: string;
}): string {
  return `${staff.firstName} ${staff.lastName}`.trim();
}
