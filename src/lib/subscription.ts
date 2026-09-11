/** Jour d'envoi mensuel borné à 1–28 (évite les mois courts). */
export function clampSubscriptionDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(28, Math.max(1, Math.round(day)));
}

/** Prochaine date d'échéance ≥ aujourd'hui (midi UTC) pour un jour du mois. */
export function nextSubscriptionDate(
  dayOfMonth: number,
  from: Date = new Date(),
): Date {
  const day = clampSubscriptionDay(dayOfMonth);
  const base = new Date(from);
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const todayUtc = Date.UTC(y, m, base.getUTCDate());

  let candidate = Date.UTC(y, m, day);
  if (candidate < todayUtc) {
    candidate = Date.UTC(y, m + 1, day);
  }
  return new Date(candidate);
}

/** Avance d'un mois à partir d'une date d'abonnement. */
export function advanceSubscriptionDate(current: Date, dayOfMonth: number): Date {
  const day = clampSubscriptionDay(dayOfMonth);
  const y = current.getUTCFullYear();
  const m = current.getUTCMonth();
  return new Date(Date.UTC(y, m + 1, day));
}

/** Échéance par défaut : même jour, N mois après l'émission (ex. 5 → 5). */
export function subscriptionDueDateFromIssue(
  issueDate: Date,
  params: {
    dueDay?: number | null;
    monthsOffset?: number | null;
    issueDay?: number | null;
  } = {},
): Date {
  const monthsOffset = Math.max(1, params.monthsOffset ?? 1);
  const fallbackDay =
    params.issueDay ??
    issueDate.getUTCDate();
  const day = clampSubscriptionDay(params.dueDay ?? fallbackDay);
  const y = issueDate.getUTCFullYear();
  const m = issueDate.getUTCMonth();
  return new Date(Date.UTC(y, m + monthsOffset, day));
}

/** Déduit le pattern d'échéance depuis une facture modèle. */
export function inferSubscriptionDuePattern(
  issueDate: Date,
  dueDate: Date,
): { dueDay: number; dueMonthsOffset: number } {
  const dueDay = clampSubscriptionDay(dueDate.getUTCDate());
  let monthsOffset =
    (dueDate.getUTCFullYear() - issueDate.getUTCFullYear()) * 12 +
    (dueDate.getUTCMonth() - issueDate.getUTCMonth());
  if (monthsOffset < 1) monthsOffset = 1;
  return { dueDay, dueMonthsOffset: monthsOffset };
}

export function defaultInvoiceDueDateIso(issueDateIso: string): string {
  const issue = new Date(`${issueDateIso.slice(0, 10)}T00:00:00.000Z`);
  return subscriptionDueDateFromIssue(issue, { monthsOffset: 1 }).toISOString().slice(0, 10);
}

export const PAYMENT_REMINDER_DAYS = [15, 20, 25] as const;
export type PaymentReminderDay = (typeof PAYMENT_REMINDER_DAYS)[number];

export function isPaymentReminderDay(day: number): day is PaymentReminderDay {
  return (PAYMENT_REMINDER_DAYS as readonly number[]).includes(day);
}
