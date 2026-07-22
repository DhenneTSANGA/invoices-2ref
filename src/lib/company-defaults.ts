import type { CompanyInfo } from "@/store/types";
import { COMPANY_DEFAULTS, type Cabinet } from "@/lib/cabinets";

export { COMPANY_DEFAULTS };

/** @deprecated Prefer COMPANY_DEFAULTS[cabinet] */
export const REAL_2REF_COMPANY: CompanyInfo = COMPANY_DEFAULTS.expertise_fiscale;

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
  } | null | undefined,
  cabinet: Cabinet = "expertise_fiscale",
): CompanyInfo {
  const fallback = COMPANY_DEFAULTS[cabinet];
  if (!row) return fallback;
  return {
    name: row.name,
    tagline: row.tagline ?? fallback.tagline,
    nif: row.nif,
    niu: row.niu || "—",
    rccm: row.rccm,
    cnss: row.cnss ?? "",
    address: row.address,
    city: row.city,
    phone: row.phone,
    email: row.email,
    website: row.website ?? "",
    bankName: row.bankName ?? "",
    bankAccount: row.bankAccount ?? "",
  };
}
