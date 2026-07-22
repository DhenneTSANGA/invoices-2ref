import type { CompanyInfo } from "@/store/types";

/** Informations légales officielles — 2R Expertise Fiscale */
export const REAL_2REF_COMPANY: CompanyInfo = {
  name: "2R EXPERTISE FISCALE",
  tagline: "SARL au capital de 10 000 000 F CFA — Conseil Fiscal",
  nif: "202601003286 Z",
  niu: "—",
  rccm: "GALBV LBV 2026 B12 B1200162",
  cnss: "",
  address: "BP 20 478, Cité Bas de Gué-Gué",
  city: "Libreville, Gabon",
  phone: "011 44 39 64 / 065 10 99 10",
  email: "expertise.fiscale@2ref.ga",
  website: "www.2ref.ga",
  bankName: "",
  bankAccount: "",
};

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
): CompanyInfo {
  if (!row) return REAL_2REF_COMPANY;
  return {
    name: row.name,
    tagline: row.tagline ?? REAL_2REF_COMPANY.tagline,
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
