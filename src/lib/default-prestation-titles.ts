import { withCommercialTaskAbbrev } from "@/lib/document-number";

/** Titres de prestation récurrents (sections facture / devis). */
export const DEFAULT_PRESTATION_TITLES = [
  "Assistance RH",
  "Assistance comptable",
  "Ingénierie financière et fiscale",
  "Élaboration DSF et DAS",
  "Assistance comptable, Administrative et RH",
  "Assistance comptable, fiscale et RH",
  "Élaboration bulletins de paie supplémentaires",
  "Élaboration bulletins de paie",
  "Révision comptable",
  "Révision et saisie comptable",
  "Saisie comptable",
  "Assistance comptable et fiscale",
  "Assistance sociale et fiscale",
  "Assistance Administrative",
  "Assistance création de société",
  "Reconstitution comptable",
  "Établissement des états financiers",
  "Régularisation comptable",
  "Audit fiscal",
  "Assistance procédure de recrutement",
  "Rédaction de contrat de travail",
  "Rédaction des actes juridiques",
  "Consultation juridique",
  "Assistance juridique",
  "Assistance fiscale",
  "Formation intra-entreprise",
  "Séminaire de formation",
] as const;

export type DefaultPrestationTitle =
  (typeof DEFAULT_PRESTATION_TITLES)[number];

/** Abrégés des prestations prédéfinies (suffixe du n° FA / DV). */
export const PRESTATION_TITLE_ABBREVS: Record<DefaultPrestationTitle, string> = {
  "Assistance RH": "ARH",
  "Assistance comptable": "AC",
  "Ingénierie financière et fiscale": "IFF",
  "Élaboration DSF et DAS": "DSF",
  "Assistance comptable, Administrative et RH": "ACARH",
  "Assistance comptable, fiscale et RH": "ACFRH",
  "Élaboration bulletins de paie supplémentaires": "EBPS",
  "Élaboration bulletins de paie": "EBP",
  "Révision comptable": "RC",
  "Révision et saisie comptable": "RSC",
  "Saisie comptable": "SC",
  "Assistance comptable et fiscale": "ACF",
  "Assistance sociale et fiscale": "ASF",
  "Assistance Administrative": "AA",
  "Assistance création de société": "ACS",
  "Reconstitution comptable": "RECC",
  "Établissement des états financiers": "EEF",
  "Régularisation comptable": "RGC",
  "Audit fiscal": "AF",
  "Assistance procédure de recrutement": "APR",
  "Rédaction de contrat de travail": "RCT",
  "Rédaction des actes juridiques": "RAJ",
  "Consultation juridique": "CJ",
  "Assistance juridique": "AJ",
  "Assistance fiscale": "AFI",
  "Formation intra-entreprise": "FRM",
  "Séminaire de formation": "FRM",
};

export function abbrevForPrestationTitle(title: string): string | null {
  const key = title.trim();
  if (!key) return null;
  const exact = (PRESTATION_TITLE_ABBREVS as Record<string, string>)[key];
  if (exact) return exact;
  const found = DEFAULT_PRESTATION_TITLES.find(
    (s) => s.toLowerCase() === key.toLowerCase(),
  );
  return found ? PRESTATION_TITLE_ABBREVS[found] : null;
}

export function prestationAbbrevFromSections(
  sections?: Array<{ title?: string | null }> | null,
): string | null {
  for (const section of sections ?? []) {
    const abbrev = abbrevForPrestationTitle(section.title ?? "");
    if (abbrev) return abbrev;
  }
  return null;
}

/** Suffixe le n° commercial avec l’abrégé de la première tâche prédéfinie. */
export function applyPrestationAbbrevToNumber(
  number: string,
  sections?: Array<{ title?: string | null }> | null,
): string {
  return withCommercialTaskAbbrev(number, prestationAbbrevFromSections(sections));
}
