import type { Cabinet, StaffRole } from "@prisma/client";

export type AppRole = StaffRole;

export function isSuperAdmin(role: AppRole): boolean {
  return role === "super_admin";
}

export function isAdmin(role: AppRole): boolean {
  return role === "admin" || role === "super_admin";
}

export function isMember(role: AppRole): boolean {
  return role === "member";
}

/** Cabinet effectif pour les requêtes données. */
export function resolveCabinet(
  role: AppRole,
  staffCabinet: Cabinet | null | undefined,
  activeCabinet: Cabinet | null | undefined,
): Cabinet {
  if (role === "super_admin") {
    return activeCabinet ?? "expertise_fiscale";
  }
  if (!staffCabinet) {
    throw new Error("Cabinet manquant pour ce collaborateur");
  }
  return staffCabinet;
}

export function canAccessDashboard(role: AppRole): boolean {
  return isAdmin(role);
}

export function canEditForeignDocuments(role: AppRole): boolean {
  return isAdmin(role);
}

export function canDeleteClients(role: AppRole): boolean {
  return isAdmin(role);
}

export function canManageCatalog(role: AppRole): boolean {
  return isAdmin(role);
}

export function canEditCompanySettings(role: AppRole): boolean {
  return isAdmin(role);
}

export function canManageAdminRequests(role: AppRole): boolean {
  return isAdmin(role);
}

export function canPromoteOrDemoteAdmins(role: AppRole): boolean {
  return isSuperAdmin(role);
}

export function canSwitchCabinet(role: AppRole): boolean {
  return isSuperAdmin(role);
}

/** Archives visibles : créateur seulement, sauf admin+ (tout le cabinet). */
export function archiveScope(role: AppRole): "own" | "cabinet" {
  return isAdmin(role) ? "cabinet" : "own";
}

export function homePathForRole(role: AppRole): "/dashboard" | "/home" {
  return canAccessDashboard(role) ? "/dashboard" : "/home";
}

export function canWriteDocument(
  role: AppRole,
  staffId: string,
  createdById: string,
): boolean {
  return canEditForeignDocuments(role) || createdById === staffId;
}

export function roleLabel(role: AppRole): string {
  if (role === "super_admin") return "Super administrateur";
  if (role === "admin") return "Administrateur";
  return "Membre";
}
