import type { AppRole } from "@/lib/roles";
import { isAdmin } from "@/lib/roles";
import type { ServiceLine } from "@/lib/prospection-model";

export type CrmRole = "manager" | "direction" | "chef_service" | "collaborateur" | "admin";

/** Profil attribué par le super admin (cahier des charges §3). */
export type CrmProfile = "direction" | "manager" | "chef_service" | "admin";

export const CRM_PROFILES: CrmProfile[] = ["manager", "direction", "chef_service", "admin"];

export const CRM_PROFILE_LABELS: Record<CrmProfile, string> = {
  manager: "Manager de service",
  direction: "Direction / associé",
  chef_service: "Chef de service",
  admin: "Administrateur",
};

export const CRM_SERVICE_LINES: ServiceLine[] = [
  "rh",
  "comptabilite",
  "conseil",
  "fiscalite",
  "formation",
];

export function parseCrmProfile(value: unknown): CrmProfile | null {
  return typeof value === "string" && (CRM_PROFILES as string[]).includes(value)
    ? (value as CrmProfile)
    : null;
}

export function parseServiceLines(value: unknown): ServiceLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is ServiceLine =>
    (CRM_SERVICE_LINES as unknown[]).includes(v),
  );
}

/**
 * Mapping 2R Hub → rôles CRM.
 * L’espace Prospection est réservé aux administrateurs ; le super admin
 * précise ensuite leur profil :
 * - super_admin → direction (pilotage + validations)
 * - admin → profil attribué (manager, chef de service, direction, administrateur),
 *   « admin » par défaut tant qu’aucun profil n’est choisi
 * - membre → collaborateur (remontée de pistes depuis Facturation uniquement)
 */
export function crmRoleFromStaff(staff: {
  role: AppRole;
  crmProfile?: CrmProfile | string | null;
}): CrmRole {
  if (staff.role === "super_admin") return "direction";
  if (staff.role === "admin") return parseCrmProfile(staff.crmProfile) ?? "admin";
  return "collaborateur";
}

/** Prospection : admin et super_admin uniquement. */
export function canUseProspectionSpace(role: AppRole): boolean {
  return isAdmin(role);
}

export function assertProspectionStaff(role: AppRole) {
  if (!canUseProspectionSpace(role)) {
    throw new Error("L’espace Prospection est réservé aux administrateurs");
  }
}

export function canSeeAllPortfolios(crm: CrmRole) {
  return crm === "direction" || crm === "admin";
}

/** Saisie prospects, opportunités, actions, dépenses (son portefeuille pour un manager). */
export function canWriteCrm(crm: CrmRole) {
  return crm === "manager" || crm === "direction" || crm === "admin";
}

export function canManagePipeline(crm: CrmRole) {
  return crm === "manager" || crm === "direction" || crm === "admin";
}

/** Validation des dépenses et des objectifs : direction (et administrateur). */
export function canApproveExpenses(crm: CrmRole) {
  return crm === "direction" || crm === "admin";
}

export function canSeeKpi(crm: CrmRole) {
  return crm === "direction" || crm === "admin" || crm === "manager";
}

export function canAdminReferentials(crm: CrmRole) {
  return crm === "admin" || crm === "direction";
}

export function canEditLibrary(crm: CrmRole) {
  return crm === "admin" || crm === "direction" || crm === "manager";
}

/** Gestion d’équipe depuis Prospection (même règle que Facturation). */
export function canManageCrmTeam(crm: CrmRole) {
  return crm === "direction" || crm === "admin";
}
