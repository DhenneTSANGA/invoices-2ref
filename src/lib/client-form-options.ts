/** Options de formulaires client (ANPI / Gabon & CEMAC). */

export const CLIENT_LEGAL_FORMS = [
  "SARL",
  "SA",
  "SAS",
  "SNC",
  "Entreprise individuelle",
  "Personne physique",
] as const;

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
