/** Options de formulaires client (ANPI / Gabon & CEMAC). */

export const CLIENT_LEGAL_FORMS = [
  "SARL (Société à Responsabilité Limitée)",
  "SA (Société Anonyme)",
  "SAS (Société par Actions Simplifiée)",
  "SNC (Société en Nom Collectif)",
  "SCI (Société Civile Immobilière)",
  "Entreprise individuelle",
  "Personne physique",
  "Autres",
] as const;

/** Valeur par défaut à la création. */
export const DEFAULT_CLIENT_LEGAL_FORM = CLIENT_LEGAL_FORMS[0];

/** Anciens libellés courts → libellés complets (clients déjà en base). */
const LEGACY_LEGAL_FORM_MAP: Record<string, (typeof CLIENT_LEGAL_FORMS)[number]> = {
  SARL: "SARL (Société à Responsabilité Limitée)",
  SA: "SA (Société Anonyme)",
  SAS: "SAS (Société par Actions Simplifiée)",
  SNC: "SNC (Société en Nom Collectif)",
};

/** Normalise une forme juridique (compatibilité anciennes fiches). */
export function normalizeLegalForm(value: string): string {
  const trimmed = value.trim();
  if ((CLIENT_LEGAL_FORMS as readonly string[]).includes(trimmed)) return trimmed;
  return LEGACY_LEGAL_FORM_MAP[trimmed] ?? trimmed;
}

export const CLIENT_REPRESENTATIVE_TITLES = [
  "Gérant",
  "Président",
  "Directeur général",
  "Administrateur",
  "Associé",
  "Propriétaire",
  "Représentant légal",
] as const;

export const CLIENT_COUNTRIES = [
  "Gabon",
  "Cameroun",
  "Congo",
  "Guinée équatoriale",
  "Tchad",
  "République centrafricaine",
  "Côte d'Ivoire",
  "Sénégal",
  "Bénin",
  "Togo",
  "France",
  "Autre",
] as const;

export const CLIENT_CITIES_BY_COUNTRY: Record<string, readonly string[]> = {
  Gabon: [
    "Libreville",
    "Port-Gentil",
    "Franceville",
    "Oyem",
    "Moanda",
    "Lambaréné",
    "Mouila",
    "Tchibanga",
    "Koulamoutou",
    "Makokou",
    "Bitam",
    "Ntoum",
    "Owendo",
    "Akanda",
  ],
  Cameroun: ["Yaoundé", "Douala", "Garoua", "Bafoussam", "Bamenda"],
  Congo: ["Brazzaville", "Pointe-Noire"],
  "Guinée équatoriale": ["Malabo", "Bata"],
  Tchad: ["N'Djaména", "Moundou"],
  "République centrafricaine": ["Bangui"],
  "Côte d'Ivoire": ["Abidjan", "Yamoussoukro", "Bouaké"],
  Sénégal: ["Dakar", "Thiès", "Saint-Louis"],
  Bénin: ["Cotonou", "Porto-Novo"],
  Togo: ["Lomé"],
  France: ["Paris", "Lyon", "Marseille", "Bordeaux", "Nantes"],
};

export function citiesForCountry(country: string): string[] {
  return [...(CLIENT_CITIES_BY_COUNTRY[country] ?? [])];
}
