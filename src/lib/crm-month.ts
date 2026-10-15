/** Mois CRM au format « AAAA-MM » (objectifs mensuels, filtres). */

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** Mois courant à Libreville (UTC+1). */
export function currentCrmMonth(now = new Date()): string {
  return new Date(now.getTime() + 3600_000).toISOString().slice(0, 7);
}

export function shiftCrmMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Date du jour à Libreville (AAAA-MM-JJ). */
export function crmTodayIso(now = new Date()): string {
  return new Date(now.getTime() + 3600_000).toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 1 = lundi … 7 = dimanche. */
export function isoWeekday(iso: string): number {
  return new Date(`${iso}T12:00:00.000Z`).getUTCDay() || 7;
}

/** Lundi de la semaine en cours à Libreville (clé de semaine, AAAA-MM-JJ). */
export function crmWeekStart(now = new Date()): string {
  const today = crmTodayIso(now);
  return addDaysIso(today, 1 - isoWeekday(today));
}

/** « octobre 2026 » */
export function monthLabelFr(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const name = MONTHS_FR[m - 1];
  return name ? `${name} ${y}` : month;
}
