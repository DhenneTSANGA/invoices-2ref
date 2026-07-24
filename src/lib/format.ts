export const currency = (n: number, c = "XAF") =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + " " + c;

export const number = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export const shortDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

export const longDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);
};

const UNITS = [
  "",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];
const TENS = [
  "",
  "",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
  "soixante",
  "quatre-vingt",
  "quatre-vingt",
];

function belowHundred(n: number): string {
  if (n < 20) return UNITS[n];
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  if (ten === 7 || ten === 9) {
    const base = ten === 7 ? "soixante" : "quatre-vingt";
    const rest = n - (ten === 7 ? 60 : 80);
    if (rest === 0) return base;
    const join = rest === 1 && ten === 7 ? " et " : "-";
    return `${base}${join}${UNITS[rest]}`;
  }
  if (ten === 8) {
    if (unit === 0) return "quatre-vingts";
    return `quatre-vingt-${UNITS[unit]}`;
  }
  if (unit === 0) return TENS[ten];
  if (unit === 1) return `${TENS[ten]} et un`;
  return `${TENS[ten]}-${UNITS[unit]}`;
}

function belowThousand(n: number): string {
  if (n < 100) return belowHundred(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const hundredWord =
    hundred === 1 ? "cent" : `${UNITS[hundred]} cent${rest === 0 ? "s" : ""}`;
  if (rest === 0) return hundredWord;
  return `${hundredWord} ${belowHundred(rest)}`;
}

function chunkToWords(n: number, scale: string, pluralScale: string): string {
  if (n === 0) return "";
  if (n === 1 && scale === "mille") return "mille";
  const body = belowThousand(n);
  const label = n > 1 ? pluralScale : scale;
  return `${body} ${label}`.trim();
}

/** Convertit un montant entier en lettres (français, XAF). */
export function amountInWords(amount: number, currencyCode = "XAF"): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) {
    return currencyCode === "XAF" ? "Zéro franc CFA" : `Zéro ${currencyCode}`;
  }

  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const rest = n % 1_000;

  const parts: string[] = [];
  if (billions) parts.push(chunkToWords(billions, "milliard", "milliards"));
  if (millions) parts.push(chunkToWords(millions, "million", "millions"));
  if (thousands) parts.push(chunkToWords(thousands, "mille", "mille"));
  if (rest) parts.push(belowThousand(rest));

  const words = parts.filter(Boolean).join(" ");
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  if (currencyCode === "XAF") {
    return `${capitalized} franc${n > 1 ? "s" : ""} CFA`;
  }
  return `${capitalized} ${currencyCode}`;
}
