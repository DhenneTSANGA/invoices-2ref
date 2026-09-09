import type { Cabinet, Prisma, StaffMember } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildNextCommercialNumber } from "@/lib/document-number";
import { companyForPreview } from "@/lib/company-defaults";
import { clientAllowsSubscription } from "@/lib/client-billing";
import { isAdmin } from "@/lib/roles";
import {
  advanceSubscriptionDate,
  clampSubscriptionDay,
  inferSubscriptionDuePattern,
  isPaymentReminderDay,
  PAYMENT_REMINDER_DAYS,
  subscriptionDueDateFromIssue,
} from "@/lib/subscription";
import { sendDocumentEmailInternal } from "@/lib/send-document-email";
import { getResend } from "@/lib/resend";
import {
  escapeHtml,
  requireResendApiKey,
  resolveCabinetMailAddresses,
  resolveManagerCc,
  resendErrorMessage,
} from "@/lib/email";
import { DOCUMENT_COLORS } from "@/lib/cabinets";
import { logOutboundMail } from "@/lib/mail-log";

export type BillingJobResult = {
  subscriptions: { generated: string[]; errors: string[]; count: number };
  reminders: { sent: number; skipped: number; errors: string[] };
};

function todayUtcDate(ref = new Date()): Date {
  return new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()),
  );
}

function periodMonthKey(ref = new Date()): string {
  const y = ref.getUTCFullYear();
  const m = String(ref.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatDateFr(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function money(n: number, currency = "XAF"): string {
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n) +
    " " +
    currency
  );
}

async function allocateInvoiceNumber(
  cabinet: Cabinet,
  issueDate: Date,
): Promise<string> {
  const rows = await prisma.document.findMany({
    where: { cabinet, type: "invoice" },
    select: { number: true },
  });
  return buildNextCommercialNumber({
    cabinet,
    type: "invoice",
    issueDate,
    existingNumbers: rows.map((r) => r.number),
  });
}

async function resolveBillingStaff(
  cabinet: Cabinet,
  preferredId: string,
): Promise<StaffMember | null> {
  const preferred = preferredId
    ? await prisma.staffMember.findUnique({ where: { id: preferredId } })
    : null;
  if (preferred && isAdmin(preferred.role)) return preferred;

  const admin = await prisma.staffMember.findFirst({
    where: {
      OR: [
        { cabinet, role: "admin" },
        { role: "super_admin" },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  return admin ?? preferred;
}

function reminderSubject(day: number, clientName: string): string {
  if (day === 15) {
    return `Rappel — factures en attente (${clientName})`;
  }
  if (day === 20) {
    return `2e relance — règlement attendu (${clientName})`;
  }
  return `Dernier rappel — factures impayées (${clientName})`;
}

function reminderIntro(day: number): string {
  if (day === 15) {
    return "Sauf erreur de notre part, les factures ci-dessous restent impayées après leur date d'échéance. Nous vous remercions de bien vouloir régulariser votre situation.";
  }
  if (day === 20) {
    return "Malgré notre précédent rappel, nous n'avons pas encore enregistré le règlement des factures listées ci-dessous. Merci de procéder au paiement dans les meilleurs délais.";
  }
  return "Il s'agit de notre dernier rappel concernant les factures impayées ci-dessous. Merci de nous contacter rapidement si un règlement a déjà été effectué.";
}

function buildReminderEmailHtml(params: {
  companyName: string;
  clientName: string;
  intro: string;
  rows: { number: string; issueDate: string; dueDate: string; total: string }[];
  totalDue: string;
  accent: string;
  accentTo: string;
}): string {
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
    <tr><td style="height:4px;background:linear-gradient(90deg, ${params.accent}, ${params.accentTo});"></td></tr>
    <tr>
      <td style="padding:24px;">
        <div style="font-size:18px;font-weight:700;color:${params.accent};">${escapeHtml(params.companyName)}</div>
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

type SubscriptionTemplate = Prisma.DocumentGetPayload<{
  include: {
    lines: { orderBy: { position: "asc" } };
    sections: { orderBy: { position: "asc" } };
  };
}>;

async function generateSubscriptionInvoice(
  template: SubscriptionTemplate,
  todayUtc: Date,
  staff: StaffMember,
): Promise<{ number: string; id: string }> {
  if (!["signed", "sent", "overdue"].includes(template.status)) {
    throw new Error(
      `Modèle ${template.number} non signé — signez et envoyez la facture modèle avant l'abonnement automatique`,
    );
  }

  const issueDate = todayUtc;
  const number = await allocateInvoiceNumber(template.cabinet, issueDate);
  const dueDate = subscriptionDueDateFromIssue(issueDate, {
    dueDay: template.subscriptionDueDay,
    monthsOffset: template.subscriptionDueMonthsOffset ?? 1,
    issueDay: template.subscriptionDay ?? undefined,
  });

  const created = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        cabinet: template.cabinet,
        type: "invoice",
        number,
        clientId: template.clientId,
        createdById: template.createdById,
        status: "signed",
        issueDate,
        dueDate,
        subtotal: template.subtotal,
        discount: template.discount ?? 0,
        tps: template.tps,
        css: template.css,
        vat: template.vat,
        total: template.total,
        currency: template.currency,
        notes: template.notes,
        paymentTerms: template.paymentTerms,
        signatoryTitle: template.signatoryTitle,
        subscriptionOfId: template.id,
      },
    });

    const sectionIdMap = new Map<string, string>();
    for (const s of template.sections) {
      const sec = await tx.documentSection.create({
        data: {
          documentId: doc.id,
          title: s.title,
          position: s.position,
        },
      });
      sectionIdMap.set(s.id, sec.id);
    }

    if (template.lines.length > 0) {
      await tx.documentLine.createMany({
        data: template.lines.map((l, position) => ({
          documentId: doc.id,
          serviceId: l.serviceId,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          vatRate: l.vatRate,
          discount: l.discount,
          tpsRate: l.tpsRate,
          cssRate: l.cssRate,
          position,
          sectionId: l.sectionId
            ? (sectionIdMap.get(l.sectionId) ?? null)
            : null,
        })),
      });
    }

    return doc;
  });

  const day = clampSubscriptionDay(template.subscriptionDay ?? 1);
  let nextAt = advanceSubscriptionDate(
    template.subscriptionNextAt ?? todayUtc,
    day,
  );
  while (nextAt.getTime() <= todayUtc.getTime()) {
    nextAt = advanceSubscriptionDate(nextAt, day);
  }
  await prisma.document.update({
    where: { id: template.id },
    data: { subscriptionNextAt: nextAt },
  });

  await sendDocumentEmailInternal({
    documentId: created.id,
    staff,
    skipAccessCheck: true,
  });

  return { number, id: created.id };
}

export async function runDueSubscriptions(options?: {
  cabinet?: Cabinet;
}): Promise<{ generated: string[]; errors: string[]; count: number }> {
  const todayUtc = todayUtcDate();
  const generated: string[] = [];
  const errors: string[] = [];

  const due = await prisma.document.findMany({
    where: {
      type: "invoice",
      isSubscription: true,
      subscriptionActive: true,
      subscriptionNextAt: { lte: todayUtc },
      ...(options?.cabinet ? { cabinet: options.cabinet } : {}),
    },
    include: {
      lines: { orderBy: { position: "asc" } },
      sections: { orderBy: { position: "asc" } },
    },
  });

  for (const template of due) {
    try {
      const client = await prisma.client.findUnique({
        where: { id: template.clientId },
        select: { billingProfile: true, email: true, name: true },
      });
      if (!client || !clientAllowsSubscription(client.billingProfile)) {
        errors.push(`${template.number}: client non abonnement`);
        continue;
      }
      if (!client.email?.trim()) {
        errors.push(`${template.number}: client sans e-mail`);
        continue;
      }

      const staff = await resolveBillingStaff(
        template.cabinet,
        template.createdById,
      );
      if (!staff) {
        errors.push(`${template.number}: aucun staff pour l'envoi`);
        continue;
      }

      const { number } = await generateSubscriptionInvoice(
        template,
        todayUtc,
        staff,
      );
      generated.push(number);
    } catch (err) {
      errors.push(
        `${template.number}: ${err instanceof Error ? err.message : "échec"}`,
      );
    }
  }

  return { generated, errors, count: generated.length };
}

export async function runPaymentReminders(options?: {
  cabinet?: Cabinet;
  refDate?: Date;
}): Promise<{ sent: number; skipped: number; errors: string[] }> {
  requireResendApiKey();
  const ref = options?.refDate ?? new Date();
  const day = ref.getUTCDate();
  if (!isPaymentReminderDay(day)) {
    return { sent: 0, skipped: 0, errors: [] };
  }

  const todayUtc = todayUtcDate(ref);
  const monthKey = periodMonthKey(ref);
  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;

  const clients = await prisma.client.findMany({
    where: {
      billingProfile: { in: ["subscription", "mixed"] },
      isTransient: false,
      ...(options?.cabinet ? { cabinet: options.cabinet } : {}),
    },
    select: {
      id: true,
      cabinet: true,
      name: true,
      email: true,
    },
  });

  for (const client of clients) {
    const email = client.email?.trim();
    if (!email) {
      skipped++;
      continue;
    }

    const existingLog = await prisma.paymentReminderLog.findUnique({
      where: {
        clientId_reminderDay_periodMonth: {
          clientId: client.id,
          reminderDay: day,
          periodMonth: monthKey,
        },
      },
    });
    if (existingLog) {
      skipped++;
      continue;
    }

    const overdue = await prisma.document.findMany({
      where: {
        clientId: client.id,
        cabinet: client.cabinet,
        type: "invoice",
        status: { in: ["sent", "overdue"] },
        dueDate: { lt: todayUtc },
        // Ne pas relancer sur la facture modèle d'abonnement (seulement les factures émises).
        NOT: {
          isSubscription: true,
          subscriptionActive: true,
          subscriptionOfId: null,
        },
      },
      orderBy: [{ dueDate: "asc" }, { number: "asc" }],
    });

    if (overdue.length === 0) {
      skipped++;
      continue;
    }

    try {
      const companyRow = await prisma.company.findUnique({
        where: { cabinet: client.cabinet },
      });
      const company = companyForPreview(companyRow, client.cabinet);
      const { from, replyTo } = resolveCabinetMailAddresses(company);
      const colors = DOCUMENT_COLORS.invoice;

      const rows = overdue.map((doc) => ({
        number: doc.number,
        issueDate: formatDateFr(doc.issueDate),
        dueDate: doc.dueDate ? formatDateFr(doc.dueDate) : "—",
        total: money(Number(doc.total), doc.currency),
      }));
      const totalDue = overdue.reduce((s, d) => s + Number(d.total), 0);
      const currency = overdue[0]?.currency ?? "XAF";

      const html = buildReminderEmailHtml({
        companyName: company.name,
        clientName: client.name,
        intro: reminderIntro(day),
        rows,
        totalDue: money(totalDue, currency),
        accent: colors.accent,
        accentTo: colors.accentTo,
      });

      const subject = reminderSubject(day, client.name);
      const managerCc = resolveManagerCc(company, email);
      const resend = getResend();
      const { data: mail, error } = await resend.emails.send({
        from,
        to: email,
        ...(managerCc ? { cc: [managerCc] } : {}),
        subject,
        html,
        ...(replyTo ? { replyTo: [replyTo] } : {}),
      });

      if (error) {
        throw new Error(resendErrorMessage(error));
      }

      await prisma.paymentReminderLog.create({
        data: {
          cabinet: client.cabinet,
          clientId: client.id,
          reminderDay: day,
          periodMonth: monthKey,
          toEmail: email,
          documentIds: overdue.map((d) => d.id),
          totalAmount: totalDue,
        },
      });

      const staff = await resolveBillingStaff(client.cabinet, "");
      if (staff) {
        await logOutboundMail({
          cabinet: client.cabinet,
          resendId: mail?.id ?? null,
          fromEmail: from,
          toEmail: email,
          ccEmail: managerCc ?? null,
          subject,
          html,
          clientId: client.id,
          staffId: staff.id,
          lastEvent: "sent",
        });
      }

      for (const doc of overdue) {
        if (doc.status === "sent") {
          await prisma.document.update({
            where: { id: doc.id },
            data: { status: "overdue" },
          });
        }
      }

      sent++;
    } catch (err) {
      errors.push(
        `${client.name}: ${err instanceof Error ? err.message : "échec"}`,
      );
    }
  }

  return { sent, skipped, errors };
}

export async function runBillingJobs(options?: {
  cabinet?: Cabinet;
  refDate?: Date;
}): Promise<BillingJobResult> {
  const subscriptions = await runDueSubscriptions(options);
  const reminders = await runPaymentReminders(options);
  return { subscriptions, reminders };
}

export { inferSubscriptionDuePattern, PAYMENT_REMINDER_DAYS };
