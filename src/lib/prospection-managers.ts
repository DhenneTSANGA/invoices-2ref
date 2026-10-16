import type { Manager, ServiceLine } from "@/lib/prospection-model";
import { canAccessSpace, type StaffSpacesAllowed } from "@/lib/app-space";
import type { AppRole } from "@/lib/roles";
import { crmRoleFromStaff } from "@/lib/prospection-access";

export function staffDisplayName(staff: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const name = `${staff.firstName ?? ""} ${staff.lastName ?? ""}`.trim();
  return name || staff.email?.trim() || "Collaborateur";
}

export function staffToCrmManager(staff: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  crmLines?: ServiceLine[] | null;
  role?: AppRole;
  crmProfile?: string | null;
  crmPortfolio?: boolean | null;
}): Manager {
  const role = staff.role
    ? crmRoleFromStaff({ role: staff.role, crmProfile: staff.crmProfile })
    : undefined;
  return {
    id: staff.id,
    name: staffDisplayName(staff),
    // L’espace Prospection n’a pas de pôle : seules les lignes de service comptent.
    lines: staff.crmLines ?? [],
    ...(role ? { role } : {}),
    // Manager, ou super admin qui porte aussi un portefeuille (droits de direction conservés).
    portfolio: role === "manager" || (staff.role === "super_admin" && Boolean(staff.crmPortfolio)),
  };
}

/** Porte un portefeuille de manager (objectifs, classement, routage, budget). */
export function carriesPortfolio(staff: {
  role: AppRole;
  crmProfile?: string | null;
  crmPortfolio?: boolean | null;
}): boolean {
  return (
    crmRoleFromStaff(staff) === "manager" ||
    (staff.role === "super_admin" && Boolean(staff.crmPortfolio))
  );
}

export function isProspectionAssignableStaff(staff: {
  role: AppRole;
  spacesAllowed?: StaffSpacesAllowed | null;
  crmProfile?: string | null;
}): boolean {
  // Managers CRM = admin / super_admin avec accès Prospection effectif.
  // Un chef de service apporte son expertise mais ne porte pas de portefeuille.
  if (crmRoleFromStaff(staff) === "chef_service") return false;
  return canAccessSpace(staff, "prospection");
}

export function resolveManagerName(id: string, managers: Manager[]): string {
  if (!id?.trim()) return "—";
  const hit = managers.find((m) => m.id === id);
  if (hit) return hit.name;
  return "Collaborateur";
}
