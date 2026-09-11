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
] as const;

export type DefaultPrestationTitle =
  (typeof DEFAULT_PRESTATION_TITLES)[number];
