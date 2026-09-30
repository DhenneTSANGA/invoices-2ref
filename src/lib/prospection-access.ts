import type { AppRole } from "@/lib/roles";

export type CrmRole = "manager" | "direction" | "chef_service" | "collaborateur" | "admin";

/** Mapping 2R Hub → rôles CRM du cahier, en attendant des rôles dédiés. */
export function crmRoleFromStaff(role: AppRole): CrmRole {
  if (role === "super_admin") return "direction";
  if (role === "admin") return "manager";
  return "collaborateur";
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
