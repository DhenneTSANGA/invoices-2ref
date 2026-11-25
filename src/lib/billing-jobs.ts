import type { Cabinet, Prisma, StaffMember } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildNextCommercialNumber } from "@/lib/document-number";
import { applyPrestationAbbrevToNumber } from "@/lib/default-prestation-titles";
import {
  loadShowDueMonthOnLines,
  persistShowDueMonthOnLines,
} from "@/lib/document-due-month-db";
import {
  loadLineHideZeroFigures,
  persistLineHideZeroFiguresForDocument,
} from "@/lib/document-line-hide-zero-db";
import {
  loadTotalRounding,
  persistTotalRounding,
} from "@/lib/document-total-rounding-db";
import {
  loadDeposits,
  persistDeposit,
} from "@/lib/document-deposit-db";
import {
  loadDiscountChoices,
  loadLineBillingKinds,
  persistDiscountChoice,
  persistLineBillingKindsForDocument,
} from "@/lib/document-funds-db";
import {
  loadLineQuantityUnits,
  persistLineQuantityUnitsForDocument,
} from "@/lib/document-line-quantity-db";
import {
  loadClientPoles,
  persistDocumentPole,
} from "@/lib/client-pole-db";
import { parseClientPole } from "@/lib/client-pole";
import { parseLineQuantityUnit } from "@/lib/line-quantity";
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
import { recordAdminSignature } from "@/lib/letter-signature.functions";
import { emailGreeting, normalizeCivility } from "@/lib/client-emails";
import { getResend } from "@/lib/resend";
import {
  requireResendApiKey,
  resolveCabinetMailAddresses,
  resolveManagerCc,
  resendErrorMessage,
} from "@/lib/email";
import { currency } from "@/lib/format";
import { DOCUMENT_COLORS } from "@/lib/cabinets";
import { buildReminderEmailHtml } from "@/lib/reminder-email";
import { resolveReminderCopy } from "@/lib/reminder-templates";
import { loadReminderTemplates } from "@/lib/reminder-templates-db";
import { logOutboundMail } from "@/lib/mail-log";

export type BillingJobResult = {
  subscriptions: {
    generated: string[];
    sent: string[];
    errors: string[];
    count: number;
  };
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

function money(n: number, currencyCode = "XAF"): string {
  return currency(n, currencyCode);
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

export async function resolveBillingStaff(
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

type SubscriptionTemplate = Prisma.DocumentGetPayload<{
  include: {
    lines: { orderBy: { position: "asc" } };
    sections: { orderBy: { position: "asc" } };
  };
}>;

/** Le modèle a déjà été traité par une autre exécution : rien à faire. */
class SubscriptionAlreadyHandled extends Error {}

function isValidEmail(value: string | null | undefined): boolean {
  return z.string().email().safeParse(value?.trim() ?? "").success;
}

/**
 * Prochaine échéance du modèle après une génération le `todayUtc`.
 * Calculée avant la création pour être enregistrée dans la même transaction.
 */
function nextSubscriptionRun(
  template: SubscriptionTemplate,
  todayUtc: Date,
): Date {
  const day = clampSubscriptionDay(template.subscriptionDay ?? 1);
  let nextAt = advanceSubscriptionDate(
    template.subscriptionNextAt ?? todayUtc,
    day,
  );
  while (nextAt.getTime() <= todayUtc.getTime()) {
    nextAt = advanceSubscriptionDate(nextAt, day);
  }
  return nextAt;
}

/**
 * Génère la facture du mois à partir du modèle.
 *
 * Dans une seule transaction : le modèle est réservé (sa prochaine échéance
 * doit être celle lue au départ) et avancé au mois suivant, et la facture est
 * créée en brouillon. Ainsi, une coupure du serveur ne peut plus laisser une
 * facture créée avec un modèle encore « dû » (doublon ISTA de novembre 2026),
 * et deux exécutions simultanées ne génèrent pas deux factures.
 * La facture passe en « signed » une fois tous ses réglages copiés
 * (voir `finalizeSubscriptionInvoice`).
 */
async function generateSubscriptionInvoice(
  template: SubscriptionTemplate,
  todayUtc: Date,
  staff: StaffMember,
): Promise<{ number: string; id: string }> {
  if (template.status === "cancelled") {
    throw new Error(`Modèle ${template.number} annulé`);
  }
  // Modèle repassé en brouillon : signature automatique du cabinet.
  if (template.status === "draft") {
    await recordAdminSignature({
      documentId: template.id,
      cabinet: template.cabinet,
      staffId: staff.id,
      note: "Signature automatique du modèle d’abonnement",
    });
  }

  const issueDate = todayUtc;
  const number = applyPrestationAbbrevToNumber(
    await allocateInvoiceNumber(template.cabinet, issueDate),
    template.sections,
  );
  const dueDate = subscriptionDueDateFromIssue(issueDate, {
    dueDay: template.subscriptionDueDay,
    monthsOffset: template.subscriptionDueMonthsOffset ?? 1,
    issueDay: template.subscriptionDay ?? undefined,
  });

  const nextAt = nextSubscriptionRun(template, todayUtc);

  const created = await prisma.$transaction(async (tx) => {
    const claimed = await tx.document.updateMany({
      where: {
        id: template.id,
        subscriptionActive: true,
        subscriptionNextAt: template.subscriptionNextAt,
      },
      data: { subscriptionNextAt: nextAt },
    });
    if (claimed.count !== 1) {
      throw new SubscriptionAlreadyHandled(template.number);
    }

    const doc = await tx.document.create({
      data: {
        cabinet: template.cabinet,
        type: "invoice",
        number,
        clientId: template.clientId,
        createdById: template.createdById,
        // Brouillon tant que les réglages ne sont pas copiés (voir finalize).
        status: "draft",
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
        showRib: template.cabinet === "conseil" ? true : (template.showRib ?? false),
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

  await finalizeSubscriptionInvoice(template, created.id);
  return { number, id: created.id };
}

/**
 * Copie les réglages du modèle sur la facture générée puis la passe en
 * « signed » (prête à l’envoi). Idempotent : sert aussi à terminer une
 * génération interrompue (facture restée en brouillon).
 */
async function finalizeSubscriptionInvoice(
  template: SubscriptionTemplate,
  invoiceId: string,
): Promise<void> {
  const created = { id: invoiceId };
  const templateFlags = await loadShowDueMonthOnLines([template.id]);
  await persistShowDueMonthOnLines(
    created.id,
    templateFlags.get(template.id) ?? false,
  );
  const templateHideZero = await loadLineHideZeroFigures(
    template.lines.map((l) => l.id),
  );
  await persistLineHideZeroFiguresForDocument(
    created.id,
    template.lines.map((l) => templateHideZero.get(l.id) ?? true),
  );
  const templateRounding = await loadTotalRounding([template.id]);
  await persistTotalRounding(
    created.id,
    templateRounding.get(template.id) ?? 0,
  );
  const templateDeposits = await loadDeposits([template.id]);
  await persistDeposit(created.id, templateDeposits.get(template.id) ?? 0);
  const templateDiscount = await loadDiscountChoices([template.id]);
  const discountChoice = templateDiscount.get(template.id);
  await persistDiscountChoice(created.id, {
    mode: discountChoice?.mode ?? "percent",
    fixed: discountChoice?.fixed ?? 0,
  });
  const templateKinds = await loadLineBillingKinds(
    template.lines.map((l) => l.id),
  );
  await persistLineBillingKindsForDocument(
    created.id,
    template.lines.map((l) => templateKinds.get(l.id) ?? "service"),
  );
  const templateUnits = await loadLineQuantityUnits(
    template.lines.map((l) => l.id),
  );
  await persistLineQuantityUnitsForDocument(
    created.id,
    template.lines.map((l) =>
      parseLineQuantityUnit(templateUnits.get(l.id)),
    ),
  );
  const clientPoles = await loadClientPoles([template.clientId]);
  await persistDocumentPole(
    created.id,
    parseClientPole(clientPoles.get(template.clientId)),
  );

  await prisma.document.updateMany({
    where: { id: invoiceId, status: "draft" },
    data: { status: "signed" },
  });
}

type PendingSubscriptionInvoice = {
  id: string;
  number: string;
  staff: StaffMember;
};

/**
 * Une facture d’abonnement générée reste au statut « signed » tant que le mail
 * n’est pas parti (l’envoi la passe en « sent »). Celles qui n’ont pas pu partir
 * (PDF en échec, temps écoulé…) sont reprises aux exécutions suivantes.
 */
const SUBSCRIPTION_RETRY_WINDOW_DAYS = 40;
/**
 * Réservation d’une facture le temps de l’envoi : `updatedAt` sert de bail, pour
 * que deux exécutions simultanées (deux utilisateurs ouvrant la liste des
 * factures) n’envoient pas deux fois le même mail.
 */
const SUBSCRIPTION_SEND_LEASE_MS = 10 * 60_000;
/**
 * Budgets de temps depuis le début de l’exécution : la fonction serveur est
 * coupée à 300 s (c’est ce qui a interrompu la génération du 20/11/2026).
 * Au-delà, on n’entame plus de génération / de rendu PDF : le reste est repris
 * à la prochaine exécution.
 */
const SUBSCRIPTION_GENERATION_BUDGET_MS = 90_000;
const SUBSCRIPTION_SEND_BUDGET_MS = 150_000;

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : "échec";
}

/** Factures déjà générées mais jamais envoyées, dont le bail a expiré. */
async function loadUnsentSubscriptionInvoices(
  options: { cabinet?: Cabinet; excludeIds: string[] },
  errors: string[],
): Promise<PendingSubscriptionInvoice[]> {
  const rows = await prisma.document.findMany({
    where: {
      type: "invoice",
      subscriptionOfId: { not: null },
      status: "signed",
      issueDate: {
        gte: new Date(
          Date.now() - SUBSCRIPTION_RETRY_WINDOW_DAYS * 24 * 60 * 60_000,
        ),
      },
      updatedAt: { lt: new Date(Date.now() - SUBSCRIPTION_SEND_LEASE_MS) },
      ...(options.excludeIds.length
        ? { id: { notIn: options.excludeIds } }
        : {}),
      ...(options.cabinet ? { cabinet: options.cabinet } : {}),
    },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      cabinet: true,
      createdById: true,
      client: { select: { name: true, email: true } },
    },
  });
  if (rows.length === 0) return [];

  // Un mail déjà parti (même si le statut n’a pas suivi) : pas de doublon.
  const mailed = await prisma.mailMessage.findMany({
    where: {
      documentId: { in: rows.map((r) => r.id) },
      direction: "outbound",
    },
    select: { documentId: true },
  });
  const mailedIds = new Set(mailed.map((m) => m.documentId));

  const pending: PendingSubscriptionInvoice[] = [];
  for (const row of rows) {
    if (mailedIds.has(row.id)) continue;
    if (!isValidEmail(row.client?.email)) {
      errors.push(
        `${row.number}: e-mail du client « ${row.client?.name ?? "?"} » invalide (${
          row.client?.email?.trim() || "vide"
        }) — corrigez la fiche client, l'envoi partira ensuite automatiquement`,
      );
      continue;
    }
    const staff = await resolveBillingStaff(row.cabinet, row.createdById);
    if (!staff) {
      errors.push(`${row.number}: aucun staff pour l'envoi`);
      continue;
    }
    pending.push({ id: row.id, number: row.number, staff });
  }
  return pending;
}

/**
 * Termine les générations interrompues : facture créée (modèle déjà avancé)
 * mais restée en brouillon parce que le serveur a été coupé avant la fin.
 */
async function recoverInterruptedGenerations(
  options: { cabinet?: Cabinet },
  errors: string[],
): Promise<PendingSubscriptionInvoice[]> {
  const drafts = await prisma.document.findMany({
    where: {
      type: "invoice",
      subscriptionOfId: { not: null },
      status: "draft",
      issueDate: {
        gte: new Date(
          Date.now() - SUBSCRIPTION_RETRY_WINDOW_DAYS * 24 * 60 * 60_000,
        ),
      },
      updatedAt: { lt: new Date(Date.now() - SUBSCRIPTION_SEND_LEASE_MS) },
      ...(options.cabinet ? { cabinet: options.cabinet } : {}),
    },
    select: { id: true, number: true, subscriptionOfId: true },
  });

  const recovered: PendingSubscriptionInvoice[] = [];
  for (const draft of drafts) {
    try {
      const { count } = await prisma.document.updateMany({
        where: {
          id: draft.id,
          status: "draft",
          updatedAt: { lt: new Date(Date.now() - SUBSCRIPTION_SEND_LEASE_MS) },
        },
        data: { updatedAt: new Date() },
      });
      if (count !== 1) continue; // reprise par une autre exécution

      const template = await prisma.document.findUnique({
        where: { id: draft.subscriptionOfId! },
        include: {
          lines: { orderBy: { position: "asc" } },
          sections: { orderBy: { position: "asc" } },
        },
      });
      if (!template) {
        errors.push(`${draft.number}: modèle d'abonnement introuvable`);
        continue;
      }
      await finalizeSubscriptionInvoice(template, draft.id);
      const staff = await resolveBillingStaff(
        template.cabinet,
        template.createdById,
      );
      if (!staff) {
        errors.push(`${draft.number}: aucun staff pour l'envoi`);
        continue;
      }
      recovered.push({ id: draft.id, number: draft.number, staff });
    } catch (err) {
      errors.push(`${draft.number}: reprise échouée (${errorText(err)})`);
    }
  }
  return recovered;
}

/**
 * Réserve la facture pour cet envoi (atomique). Une facture qui vient d’être
 * générée par cette exécution est réservée sans condition de bail.
 */
async function claimSubscriptionInvoice(
  id: string,
  justGenerated: boolean,
): Promise<boolean> {
  const { count } = await prisma.document.updateMany({
    where: {
      id,
      status: "signed",
      ...(justGenerated
        ? {}
        : {
            updatedAt: {
              lt: new Date(Date.now() - SUBSCRIPTION_SEND_LEASE_MS),
            },
          }),
    },
    data: { updatedAt: new Date() },
  });
  return count === 1;
}

/**
 * Rend le PDF (Chromium serveur) puis envoie chaque facture au client.
 * Jamais d’envoi sans PDF : en cas d’échec, la facture reste « signed » et
 * sera reprise plus tard. Un seul navigateur sert pour tout le lot.
 */
async function emailSubscriptionInvoices(params: {
  fresh: PendingSubscriptionInvoice[];
  cabinet?: Cabinet;
  startedAt: number;
  errors: string[];
}): Promise<string[]> {
  const { errors } = params;
  const freshIds = new Set(params.fresh.map((i) => i.id));
  const retries = await loadUnsentSubscriptionInvoices(
    { cabinet: params.cabinet, excludeIds: [...freshIds] },
    errors,
  );
  const queue = [...params.fresh, ...retries];
  if (queue.length === 0) return [];

  const sent: string[] = [];
  const { createDocumentPdfRenderer } = await import(
    "@/lib/pdf/server-render"
  );
  let renderer: Awaited<ReturnType<typeof createDocumentPdfRenderer>>;
  try {
    renderer = await createDocumentPdfRenderer();
  } catch (err) {
    errors.push(
      `PDF serveur indisponible (${errorText(err)}) : ${queue.length} facture(s) non envoyée(s), nouvel essai plus tard`,
    );
    return sent;
  }

  try {
    for (let i = 0; i < queue.length; i++) {
      const invoice = queue[i]!;
      if (Date.now() - params.startedAt > SUBSCRIPTION_SEND_BUDGET_MS) {
        errors.push(
          `${queue.length - i} facture(s) en attente d'envoi : reprise automatique à la prochaine ouverture de la liste des factures`,
        );
        break;
      }

      if (!(await claimSubscriptionInvoice(invoice.id, freshIds.has(invoice.id)))) {
        continue; // déjà envoyée ou prise en charge par une autre exécution
      }

      let pdf: Awaited<ReturnType<typeof renderer.render>>;
      try {
        pdf = await renderer.render(invoice.id);
      } catch (err) {
        errors.push(
          `${invoice.number}: PDF non généré (${errorText(err)}), mail non envoyé — nouvel essai plus tard`,
        );
        continue;
      }

      try {
        await sendDocumentEmailInternal({
          documentId: invoice.id,
          staff: invoice.staff,
          skipAccessCheck: true,
          pdfBase64: pdf.base64,
          fileName: pdf.fileName,
          previewImageBase64: pdf.previewBase64,
        });
        sent.push(invoice.number);
      } catch (err) {
        errors.push(`${invoice.number}: envoi échoué (${errorText(err)})`);
      }
    }
  } finally {
    await renderer.close();
  }
  return sent;
}

export async function runDueSubscriptions(options?: {
  cabinet?: Cabinet;
}): Promise<{
  generated: string[];
  sent: string[];
  errors: string[];
  count: number;
}> {
  const startedAt = Date.now();
  const todayUtc = todayUtcDate();
  const generated: string[] = [];
  const errors: string[] = [];
  const pending: PendingSubscriptionInvoice[] = [];

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

  pending.push(
    ...(await recoverInterruptedGenerations(
      { cabinet: options?.cabinet },
      errors,
    )),
  );

  for (let i = 0; i < due.length; i++) {
    const template = due[i]!;
    if (Date.now() - startedAt > SUBSCRIPTION_GENERATION_BUDGET_MS) {
      errors.push(
        `${due.length - i} abonnement(s) pas encore générés : reprise automatique à la prochaine ouverture de la liste des factures`,
      );
      break;
    }
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
        errors.push(`${template.number}: client « ${client.name} » sans e-mail`);
        continue;
      }
      if (!isValidEmail(client.email)) {
        errors.push(
          `${template.number}: e-mail du client « ${client.name} » invalide (${client.email.trim()})`,
        );
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

      const created = await generateSubscriptionInvoice(
        template,
        todayUtc,
        staff,
      );
      generated.push(created.number);
      pending.push({ ...created, staff });
    } catch (err) {
      if (err instanceof SubscriptionAlreadyHandled) continue;
      errors.push(
        `${template.number}: ${err instanceof Error ? err.message : "échec"}`,
      );
    }
  }

  const sent = await emailSubscriptionInvoices({
    fresh: pending,
    cabinet: options?.cabinet,
    startedAt,
    errors,
  });

  return { generated, sent, errors, count: generated.length };
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
  const templatesByCabinet = new Map<
    Cabinet,
    Awaited<ReturnType<typeof loadReminderTemplates>>
  >();

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
      civility: true,
      contactName: true,
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

    // Relance avant échéance (15 / 20 / 25 du mois) : facture envoyée,
    // pas encore échue, non payée. Ex. émise le 25, 30 ou 05 → relances
    // les 15, 20, 25 suivants tant que l’échéance n’est pas passée.
    const unpaid = await prisma.document.findMany({
      where: {
        clientId: client.id,
        cabinet: client.cabinet,
        type: "invoice",
        status: "sent",
        issueDate: { lt: todayUtc },
        dueDate: { gt: todayUtc },
        // Ne pas relancer sur la facture modèle d'abonnement (seulement les factures émises).
        NOT: {
          isSubscription: true,
          subscriptionActive: true,
          subscriptionOfId: null,
        },
      },
      orderBy: [{ dueDate: "asc" }, { number: "asc" }],
    });

    if (unpaid.length === 0) {
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
      let templates = templatesByCabinet.get(client.cabinet);
      if (!templates) {
        templates = await loadReminderTemplates(client.cabinet);
        templatesByCabinet.set(client.cabinet, templates);
      }
      const copy = resolveReminderCopy(templates, day, {
        clientName: client.name,
        companyName: company.name,
      });

      const rows = unpaid.map((doc) => ({
        number: doc.number,
        issueDate: formatDateFr(doc.issueDate),
        dueDate: doc.dueDate ? formatDateFr(doc.dueDate) : "—",
        total: money(Number(doc.total), doc.currency),
      }));
      const totalDue = unpaid.reduce((s, d) => s + Number(d.total), 0);
      const currency = unpaid[0]?.currency ?? "XAF";

      const html = buildReminderEmailHtml({
        companyName: company.name,
        clientName: client.name,
        // Relance : adresse principale → civilité + représentant de la fiche.
        greeting: emailGreeting({
          civility: normalizeCivility(client.civility),
          name: client.contactName ?? "",
        }),
        intro: copy.intro,
        rows,
        totalDue: money(totalDue, currency),
        accent: colors.accent,
        accentTo: colors.accentTo,
      });

      const subject = copy.subject;
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
          documentIds: unpaid.map((d) => d.id),
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
