/** Villes d’émission proposées sur les courriers. */
export const LETTER_PLACE_CITIES = ["Libreville", "Port-Gentil"] as const;

export type LetterPlaceCity = (typeof LETTER_PLACE_CITIES)[number];

export const DEFAULT_LETTER_PLACE_CITY: LetterPlaceCity = "Libreville";

export function isLetterPlaceCity(value: string): value is LetterPlaceCity {
  return (LETTER_PLACE_CITIES as readonly string[]).includes(value);
}

/** Ligne « Ville, le … » — préfère placeCity du document. */
export function letterPlaceCityLabel(
  placeCity: string | null | undefined,
  companyCity?: string | null,
): string {
  const chosen = placeCity?.trim();
  if (chosen) return chosen;
  const raw = (companyCity ?? "").trim();
  if (!raw) return DEFAULT_LETTER_PLACE_CITY;
  // "Libreville - Port-Gentil, Gabon" → tenter la 1re ville connue
  const beforeComma = raw.split(",")[0]?.trim() ?? raw;
  for (const city of LETTER_PLACE_CITIES) {
    if (beforeComma.toLowerCase().startsWith(city.toLowerCase())) return city;
  }
  if (beforeComma.toLowerCase() === "lbv") return "Libreville";
  return beforeComma || DEFAULT_LETTER_PLACE_CITY;
}
