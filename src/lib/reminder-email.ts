import { DOCUMENT_COLORS } from "@/lib/cabinets";
import { escapeHtml } from "@/lib/email";

export type ReminderEmailRow = {
  number: string;
  issueDate: string;
  dueDate: string;
  total: string;
};

/** Factures fictives pour l’aperçu des modèles de relance. */
export const REMINDER_PREVIEW_ROWS: ReminderEmailRow[] = [
  {
    number: "FAC-2026-0142",
    issueDate: "5 mars 2026",
    dueDate: "5 avril 2026",
    total: "1\u00A0250\u00A0000 XAF",
  },
  {
    number: "FAC-2026-0158",
    issueDate: "12 mars 2026",
    dueDate: "12 avril 2026",
    total: "480\u00A0000 XAF",
  },
];

export const REMINDER_PREVIEW_TOTAL = "1\u00A0730\u00A0000 XAF";

export function buildReminderEmailHtml(params: {
  companyName: string;
  clientName: string;
  intro: string;
  rows: ReminderEmailRow[];
  totalDue: string;
  accent?: string;
  accentTo?: string;
}): string {
  const accent = params.accent ?? DOCUMENT_COLORS.invoice.accent;
  const accentTo = params.accentTo ?? DOCUMENT_COLORS.invoice.accentTo;
  const tableRows = params.rows
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;">${escapeHtml(r.number)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;">${escapeHtml(r.issueDate)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;">${escapeHtml(r.dueDate)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;text-align:right;font-weight:600;">${escapeHtml(r.total)}</td>
      </tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:24px;background:#F1F5F9;font-family:'Segoe UI',Tahoma,sans-serif;color:#0F172A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
    <tr><td style="height:4px;background:linear-gradient(90deg, ${accent}, ${accentTo});"></td></tr>
    <tr>
      <td style="padding:24px;">
        <div style="font-size:18px;font-weight:700;color:${accent};">${escapeHtml(params.companyName)}</div>
        <div style="margin-top:16px;font-size:15px;font-weight:600;">Relance de paiement</div>
        <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#334155;">
          Madame, Monsieur,<br/><br/>
          ${escapeHtml(params.intro)}
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-collapse:collapse;">
          <tr style="background:#F8FAFC;">
            <th align="left" style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748B;">Facture</th>
            <th align="left" style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748B;">Émission</th>
            <th align="left" style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748B;">Échéance</th>
            <th align="right" style="padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748B;">Montant</th>
          </tr>
          ${tableRows}
        </table>
        <div style="margin-top:16px;text-align:right;font-size:15px;font-weight:700;">
          Total dû : ${escapeHtml(params.totalDue)}
        </div>
        <div style="margin-top:20px;font-size:13px;color:#64748B;">
          Client : ${escapeHtml(params.clientName)}
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
