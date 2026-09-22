import type { Cabinet, DocumentType } from "@prisma/client";

export type CommercialDocType = "invoice" | "quotation";

export function commercialNumberPrefix(
  type: CommercialDocType,
): "FA" | "DV" {
  return type === "invoice" ? "FA" : "DV";
}

/** Ex. FA12-31-07-2026 — compteur sans plafond + jour-mois-année. */
export function formatCommercialDocumentNumber(
  prefix: "FA" | "DV",
  seq: number,
  issueDate: string | Date,
): string {
  const iso =
    typeof issueDate === "string"
      ? issueDate.slice(0, 10)
      : issueDate.toISOString().slice(0, 10);
  const [yyyy, mm, dd] = iso.split("-");
  return `${prefix}${seq}-${dd}-${mm}-${yyyy}`;
}

/** FA1-03-09-2026 ou FA1-03-09-2026RC */
const COMMERCIAL_NUMBER_RE =
  /^(FA|DV)(\d+)-(\d{2})-(\d{2})-(\d{4})([A-Z0-9]*)$/i;

/** Retire l’abrégé de tâche en fin de numéro. */
export function stripCommercialTaskAbbrev(number: string): string {
  const m = number.trim().match(COMMERCIAL_NUMBER_RE);
  if (!m) return number.trim();
  return `${m[1]!.toUpperCase()}${m[2]}-${m[3]}-${m[4]}-${m[5]}`;
}

/** Ajoute ou remplace l’abrégé de tâche (RC, DSF…). */
export function withCommercialTaskAbbrev(
  number: string,
  abbrev?: string | null,
): string {
  const base = stripCommercialTaskAbbrev(number);
  const code = (abbrev ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return code ? `${base}${code}` : base;
}

/** Extrait le compteur depuis FA12-31-07-2026 (ou formats proches FA12-…). */
export function parseCommercialSequence(
  number: string,
  prefix: "FA" | "DV",
): number | null {
  const m = number.match(new RegExp(`^${prefix}(\\d+)(?:-|$)`));
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

export function nextSequenceFromNumbers(
  numbers: string[],
  prefix: "FA" | "DV",
): number {
  let max = 0;
  for (const number of numbers) {
    const seq = parseCommercialSequence(number, prefix);
    if (seq != null && seq > max) max = seq;
  }
  return max + 1;
}

export function isCommercialDocType(
  type: DocumentType,
): type is CommercialDocType {
  return type === "invoice" || type === "quotation";
}

export type AllocateArgs = {
  cabinet: Cabinet;
  type: CommercialDocType;
  issueDate: string | Date;
  existingNumbers: string[];
};

export function buildNextCommercialNumber(args: AllocateArgs): string {
  const prefix = commercialNumberPrefix(args.type);
  const seq = nextSequenceFromNumbers(args.existingNumbers, prefix);
  return formatCommercialDocumentNumber(prefix, seq, args.issueDate);
}
