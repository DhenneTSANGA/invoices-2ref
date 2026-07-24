import type { Cabinet } from "@prisma/client";
import type { CompanyInfo } from "@/store/types";

export type { Cabinet };

export const CABINETS = ["conseil", "expertise_fiscale"] as const;

export const CABINET_LABELS: Record<Cabinet, string> = {
  conseil: "2R Conseil",
  expertise_fiscale: "2R Expertise Fiscale",
};

export const CABINET_LOGOS: Record<Cabinet, string> = {
  conseil: "/logo-2r-conseil.png",
  expertise_fiscale: "/logo-2ref.png",
};

export type CabinetScope = "all" | Cabinet;

export const CABINET_SCOPE_OPTIONS: { value: CabinetScope; label: string }[] = [
  { value: "conseil", label: CABINET_LABELS.conseil },
  { value: "expertise_fiscale", label: CABINET_LABELS.expertise_fiscale },
  { value: "all", label: "Tous les cabinets" },
];

export const STAFF_JOB_TITLES = [
  {
    value: "assistant_direction",
    label: "Assistant de direction",
  },
  {
    value: "responsable_administratif",
    label: "Responsable administratif",
  },
  {
    value: "comptable",
    label: "Comptable",
  },
  {
    value: "service_commercial",
    label: "Service commercial",
  },
] as const;

export type StaffJobTitleValue = (typeof STAFF_JOB_TITLES)[number]["value"];

export function jobTitleLabel(value: string): string {
  return STAFF_JOB_TITLES.find((j) => j.value === value)?.label ?? value;
}

/** Accepte la valeur technique ou le libellé affiché. */
export function normalizeJobTitleValue(value: string): StaffJobTitleValue | null {
  const trimmed = value.trim();
  const byValue = STAFF_JOB_TITLES.find((j) => j.value === trimmed);
  if (byValue) return byValue.value;
  const byLabel = STAFF_JOB_TITLES.find(
    (j) => j.label.toLowerCase() === trimmed.toLowerCase(),
  );
  return byLabel?.value ?? null;
}

export const COMPANY_DEFAULTS: Record<Cabinet, CompanyInfo> = {
  expertise_fiscale: {
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
  },
  conseil: {
    name: "2R CONSEIL",
    tagline: "Cabinet de conseil — Libreville",
    nif: "—",
    niu: "—",
    rccm: "—",
    cnss: "",
    address: "BP 20 478, Cité Bas de Gué-Gué",
    city: "Libreville, Gabon",
    phone: "011 44 39 64 / 065 10 99 10",
    email: "conseil@2ref.ga",
    website: "www.2ref.ga",
    bankName: "",
    bankAccount: "",
  },
};

export function isCabinet(value: unknown): value is Cabinet {
  return value === "conseil" || value === "expertise_fiscale";
}
