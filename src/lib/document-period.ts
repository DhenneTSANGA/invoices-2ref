/** Période optionnelle d’une facture, stockée au format « AAAA-MM ». */

export const PERIOD_MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

const PERIOD_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Normalise une période ; toute valeur invalide ou vide donne `null`. */
export function parseDocumentPeriod(value: string | null | undefined): string | null {
  const v = value?.trim() ?? "";
  return PERIOD_RE.test(v) ? v : null;
}

export function documentPeriodParts(
  value: string | null | undefined,
): { year: number; month: number } | null {
  const m = parseDocumentPeriod(value)?.match(PERIOD_RE);
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

export function formatDocumentPeriodValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** « Octobre 2026 » — vide si aucune période. */
export function documentPeriodLabel(value: string | null | undefined): string {
  const parts = documentPeriodParts(value);
  if (!parts) return "";
  return `${PERIOD_MONTHS_FR[parts.month - 1]} ${parts.year}`;
}
