/** Objets de courrier récurrents. */
export const DEFAULT_LETTER_SUBJECTS = [
  "Renouvellement de contrat de prestation",
  "Notification de fin de contrat de prestation",
  "Demande d'attestation pour soumission",
  "Suspension de contrat de prestation",
  "Demande de découvert bancaire",
  "État des dettes",
  "Relance de paiement",
] as const;

export type DefaultLetterSubject = (typeof DEFAULT_LETTER_SUBJECTS)[number];
