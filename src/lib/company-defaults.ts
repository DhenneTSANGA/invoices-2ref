import type { CompanyInfo } from "@/store/types";
import { COMPANY_DEFAULTS, type Cabinet } from "@/lib/cabinets";

export { COMPANY_DEFAULTS };

/** Ancien libellé Expertise Fiscale — remplacé automatiquement à l’affichage. */
const LEGACY_EXPERTISE_TAGLINE =
  "SARL au capital de 10 000 000 F CFA — Conseil Fiscal";
const LEGACY_CITIES_TAGLINE = "Libreville, Port-Gentil et Moanda";
const LEGACY_EXPERTISE_CITY = "Libreville, Gabon";

/** @deprecated Prefer COMPANY_DEFAULTS[cabinet] */
export const REAL_2REF_COMPANY: CompanyInfo = COMPANY_DEFAULTS.expertise_fiscale;

function resolveTagline(
  raw: string | null | undefined,
  fallback: string,
  cabinet: Cabinet,
): string {
  const tagline = (raw ?? fallback).trim() || fallback;
  if (
    cabinet === "expertise_fiscale" &&
    (tagline === LEGACY_EXPERTISE_TAGLINE || tagline === LEGACY_CITIES_TAGLINE)
  ) {
    return fallback;
  }
  return tagline;
}

function resolveCity(
  raw: string | null | undefined,
  fallback: string,
  cabinet: Cabinet,
): string {
  const city = (raw ?? fallback).trim() || fallback;
  if (cabinet === "expertise_fiscale" && city === LEGACY_EXPERTISE_CITY) {
    return fallback;
  }
  return city;
}

export function companyForPreview(
  row: {
    name: string;
    tagline: string | null;
    nif: string;
    niu: string;
    rccm: string;
    cnss: string | null;
    address: string;
    city: string;
    phone: string;
    email: string;
    website: string | null;
    bankName: string | null;
    bankAccount: string | null;
    mailFromEmail?: string | null;
    mailReplyTo?: string | null;
    managerName?: string | null;
    stampUrl?: string | null;
  } | null | undefined,
  cabinet: Cabinet = "expertise_fiscale",
): CompanyInfo {
  const fallback = COMPANY_DEFAULTS[cabinet];
  if (!row) return fallback;
  return {
    name: row.name,
    tagline: resolveTagline(row.tagline, fallback.tagline, cabinet),
    capital: fallback.capital,
    nif: row.nif,
    niu: row.niu || "—",
    rccm: row.rccm,
    cnss: row.cnss ?? "",
    address: row.address,
    city: resolveCity(row.city, fallback.city, cabinet),
    phone: row.phone,
    email: row.email,
    website: row.website ?? "",
    bankName: row.bankName?.trim() || fallback.bankName,
    bankAccount: row.bankAccount?.trim() || fallback.bankAccount,
    mailFromEmail:
      row.mailFromEmail?.trim() ||
      row.email?.trim() ||
      fallback.mailFromEmail ||
      fallback.email,
    mailReplyTo:
      row.mailReplyTo?.trim() ||
      row.mailFromEmail?.trim() ||
      row.email?.trim() ||
      fallback.mailReplyTo ||
      fallback.email,
    managerName: row.managerName?.trim() || fallback.managerName || "",
    stampUrl: row.stampUrl?.trim() || fallback.stampUrl || "",
  };
}
