import type { Cabinet } from "@/lib/cabinets";
import { DEFAULT_LETTER_SUBJECTS } from "@/lib/default-letter-subjects";

/** Langue du courriel dans la référence. */
export type LetterLanguage = "CF" | "CA";

/** Service émetteur. */
export type LetterServiceCode = "SA" | "DIR" | "SAF";

export const LETTER_LANGUAGES: {
  code: LetterLanguage;
  label: string;
}[] = [
  { code: "CF", label: "Courriel français" },
  { code: "CA", label: "Courriel anglais" },
];

export const LETTER_SERVICES: {
  code: LetterServiceCode;
  label: string;
}[] = [
  { code: "SA", label: "Service administratif" },
  { code: "DIR", label: "Direction" },
  { code: "SAF", label: "Service audit fiscal" },
];

/** Préfixe cabinet dans la réf (2RC / 2REF). */
export function letterCabinetPrefix(cabinet: Cabinet): "2RC" | "2REF" {
  return cabinet === "conseil" ? "2RC" : "2REF";
}

/** Code cabinet final (ROB / RIB). */
export function letterCabinetSuffix(cabinet: Cabinet): "ROB" | "RIB" {
  return cabinet === "conseil" ? "ROB" : "RIB";
}

/** Année courte depuis date d’émission (2026 → 026). */
export function letterYearCode(issueDate: string | Date): string {
  const iso =
    typeof issueDate === "string"
      ? issueDate.slice(0, 10)
      : issueDate.toISOString().slice(0, 10);
  const yyyy = iso.slice(0, 4);
  return yyyy.slice(1); // 2026 → 026
}

/** Abrégés des objets prédéfinis. */
export const LETTER_SUBJECT_ABBREVS: Record<
  (typeof DEFAULT_LETTER_SUBJECTS)[number],
  string
> = {
  "Renouvellement de contrat de prestation": "RCP",
  "Notification de fin de contrat de prestation": "NFCP",
  "Demande d'attestation pour soumission": "DAS",
  "Suspension de contrat de prestation": "SCP",
  "Demande de découvert bancaire": "DDB",
  "État des dettes": "EDD",
  "Relance de paiement": "RDP",
};

export function abbrevForLetterSubject(subject: string): string | null {
  const key = subject.trim();
  if (!key) return null;
  const exact = (LETTER_SUBJECT_ABBREVS as Record<string, string>)[key];
  if (exact) return exact;
  // Match insensible à la casse
  const found = DEFAULT_LETTER_SUBJECTS.find(
    (s) => s.toLowerCase() === key.toLowerCase(),
  );
  return found ? LETTER_SUBJECT_ABBREVS[found] : null;
}

/** Objet choisi dans la liste prédéfinie. */
export function isPredefinedLetterSubject(subject: string): boolean {
  return abbrevForLetterSubject(subject) != null;
}

/** Normalise un abrégé objet (lettres/chiffres, majuscules). */
export function normalizeSubjectAbbrev(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

/**
 * Abrégé pour la référence :
 * - objet prédéfini → abrégé imposé par la liste ;
 * - sinon → saisie manuelle (ou OBJ si vide).
 */
export function resolveLetterSubjectAbbrev(
  subject: string,
  manualAbbrev = "",
): string {
  const key = subject.trim();
  const fromList = key ? abbrevForLetterSubject(key) : null;
  if (fromList) return fromList;
  return normalizeSubjectAbbrev(manualAbbrev) || "OBJ";
}

export type LetterRefParts = {
  cabinet: Cabinet;
  language: LetterLanguage;
  seq: number;
  issueDate: string | Date;
  subjectAbbrev: string;
  service: LetterServiceCode;
};

/** Construit : 2RC/CF/002/026/RCNF/ROB/SA */
export function buildLetterRef(parts: LetterRefParts): string {
  const seq = String(Math.max(1, parts.seq)).padStart(3, "0");
  const abbr = normalizeSubjectAbbrev(parts.subjectAbbrev) || "OBJ";
  return [
    letterCabinetPrefix(parts.cabinet),
    parts.language,
    seq,
    letterYearCode(parts.issueDate),
    abbr,
    letterCabinetSuffix(parts.cabinet),
    parts.service,
  ].join("/");
}

export type ParsedLetterRef = {
  cabinetPrefix: "2RC" | "2REF";
  language: LetterLanguage;
  seq: number;
  yearCode: string;
  subjectAbbrev: string;
  cabinetSuffix: "ROB" | "RIB";
  service: LetterServiceCode;
};

const REF_RE =
  /^(2RC|2REF)\/(CF|CA)\/(\d{1,6})\/(\d{3})\/([A-Z0-9]+)\/(ROB|RIB)\/(SA|DIR|SAF)$/i;

export function parseLetterRef(number: string): ParsedLetterRef | null {
  const m = number.trim().match(REF_RE);
  if (!m) return null;
  return {
    cabinetPrefix: m[1]!.toUpperCase() as "2RC" | "2REF",
    language: m[2]!.toUpperCase() as LetterLanguage,
    seq: Number.parseInt(m[3]!, 10),
    yearCode: m[4]!,
    subjectAbbrev: m[5]!.toUpperCase(),
    cabinetSuffix: m[6]!.toUpperCase() as "ROB" | "RIB",
    service: m[7]!.toUpperCase() as LetterServiceCode,
  };
}

/** Extrait le compteur pour une année donnée (code 026). */
export function parseLetterSequenceForYear(
  number: string,
  yearCode: string,
): number | null {
  const parsed = parseLetterRef(number);
  if (!parsed) return null;
  if (parsed.yearCode !== yearCode) return null;
  return Number.isFinite(parsed.seq) ? parsed.seq : null;
}

export function nextLetterSequenceFromNumbers(
  numbers: string[],
  yearCode: string,
): number {
  let max = 0;
  for (const number of numbers) {
    const seq = parseLetterSequenceForYear(number, yearCode);
    if (seq != null && seq > max) max = seq;
  }
  return max + 1;
}

export function isLetterLanguage(v: string): v is LetterLanguage {
  return v === "CF" || v === "CA";
}

export function isLetterServiceCode(v: string): v is LetterServiceCode {
  return v === "SA" || v === "DIR" || v === "SAF";
}
