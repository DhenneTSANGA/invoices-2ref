import type { AppRole } from "@/lib/roles";
import { isAdmin } from "@/lib/roles";

export type CrmRole = "manager" | "direction" | "chef_service" | "collaborateur" | "admin";

/**
 * Mapping 2R Hub → rôles CRM.
 * L’espace Prospection est réservé aux administrateurs :
 * - super_admin → direction (pilotage + validations)
 * - admin → admin CRM (pipeline, budget, réglages)
 * - membre → refus côté gate (collaborateur conservé pour compat nav)
 */
export function crmRoleFromStaff(role: AppRole): CrmRole {
  if (role === "super_admin") return "direction";
  if (role === "admin") return "admin";
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

export function canManagePipeline(crm: CrmRole) {
  return crm === "manager" || crm === "direction" || crm === "admin";
}

export function canApproveExpenses(crm: CrmRole) {
  return crm === "direction" || crm === "admin";
}

export function canSeeKpi(crm: CrmRole) {
  return crm === "direction" || crm === "admin" || crm === "manager";
}

export function canAdminReferentials(crm: CrmRole) {
  return crm === "admin" || crm === "direction";
}

/** Gestion d’équipe depuis Prospection (même règle que Facturation). */
export function canManageCrmTeam(crm: CrmRole) {
  return crm === "direction" || crm === "admin";
}
