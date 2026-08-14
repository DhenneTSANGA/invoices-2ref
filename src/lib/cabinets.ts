import type { Cabinet } from "@prisma/client";
import type { CompanyInfo } from "@/store/types";

export type { Cabinet };

export const CABINETS = ["conseil", "expertise_fiscale"] as const;

/** Nom commercial de la plateforme web. */
export const APP_NAME = "2R Hub";

export const CABINET_LABELS: Record<Cabinet, string> = {
  conseil: "2R Conseil",
  expertise_fiscale: "2R Expertise Fiscale",
};

export const CABINET_LOGOS: Record<Cabinet, string> = {
  conseil: "/optimized/logo-2r-conseil.webp",
  expertise_fiscale: "/optimized/logo-2ref.webp",
};

/** Couleurs documents (charte 2R Conseil : bleu marine + vert). */
export const DOCUMENT_COLORS = {
  invoice: {
    accent: "#01004C",
    accentTo: "#1A1860",
  },
  quotation: {
    /** Vert un peu plus soutenu pour le contraste texte blanc / en-têtes. */
    accent: "#5C9A35",
    /** Vert charte (#8BC163). */
    accentTo: "#8BC163",
  },
  letter: {
    /** Bleu marine charte — aligné facture pour les courriels. */
    accent: "#01004C",
    accentTo: "#1A1860",
  },
} as const;

export type CabinetScope = Cabinet;

export const CABINET_SCOPE_OPTIONS: { value: CabinetScope; label: string }[] = [
  { value: "conseil", label: CABINET_LABELS.conseil },
  { value: "expertise_fiscale", label: CABINET_LABELS.expertise_fiscale },
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
    tagline: "Libreville - Port-Gentil",
    capital: "SARL au capital de 10 000 000 F CFA",
    nif: "202601003286 Z",
    niu: "—",
    rccm: "GALBV LBV 2026 B12 B1200162",
    cnss: "",
    address: "BP 20 478, Cité Bas de Gué-Gué",
    city: "Libreville - Port-Gentil, Gabon",
    phone: "011 44 39 64 / 065 10 99 10",
    email: "expertise.fiscale@2ref.ga",
    website: "www.2ref.ga",
    bankName: "Orabank Gabon",
    bankAccount: "40021 01002 25911900201 45",
    mailFromEmail: "2ref@2r-hub.com",
    mailReplyTo: "2ref@2r-hub.com",
    managerName: "M. Richard BICKAPA NIONGUI",
    managerEmail: "",
    stampUrl: "",
  },
  conseil: {
    name: "2R Conseil",
    tagline: "Entreprise au capital de 1 000 000 FCFA",
    capital: "Entreprise au capital de 1 000 000 FCFA",
    nif: "202401006569 F",
    niu: "748151N",
    rccm: "GA-LBV-01-2019-B12-00097",
    cnss: "",
    address: "BP 20478",
    city: "LBV, Gabon",
    phone: "077 52 24 / 011 44 39 64",
    email: "contact@2rconseil.ga",
    website: "www.2rconseil.ga",
    bankName: "Orabank Gabon",
    bankAccount: "40003 04130 41051542011 61",
    mailFromEmail: "2rconseil@2r-hub.com",
    mailReplyTo: "2rconseil@2r-hub.com",
    managerName: "M. Romaric BOULINGUI",
    managerEmail: "",
    stampUrl: "",
  },
};

export function isCabinet(value: unknown): value is Cabinet {
  return value === "conseil" || value === "expertise_fiscale";
}

/** Libellé fiscal de l’identifiant secondaire (NIU / STAT). */
export function niuLabelForCabinet(cabinet: Cabinet): "STAT" | "NIU" {
  return cabinet === "conseil" ? "STAT" : "NIU";
}
