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
