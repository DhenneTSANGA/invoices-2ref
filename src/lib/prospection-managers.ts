import type { ClientPole } from "@/lib/client-pole";
import { isClientPole } from "@/lib/client-pole";
import type { Manager, ServiceLine } from "@/lib/prospection-model";
import { canAccessSpace, type StaffSpacesAllowed } from "@/lib/app-space";
import type { AppRole } from "@/lib/roles";
import { crmRoleFromStaff } from "@/lib/prospection-access";

const POLE_TO_LINES: Record<ClientPole, ServiceLine[]> = {
  formation: ["formation"],
  audit: ["conseil"],
  juridique: ["conseil"],
  comptabilite: ["comptabilite"],
};

export function linesFromStaffPole(pole: unknown): ServiceLine[] {
  if (!isClientPole(pole)) return [];
  return POLE_TO_LINES[pole] ?? [];
}

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
  pole?: unknown;
  crmLines?: ServiceLine[] | null;
  role?: AppRole;
  crmProfile?: string | null;
}): Manager {
  return {
    id: staff.id,
    name: staffDisplayName(staff),
    lines: staff.crmLines?.length ? staff.crmLines : linesFromStaffPole(staff.pole),
    ...(staff.role ? { role: crmRoleFromStaff({ role: staff.role, crmProfile: staff.crmProfile }) } : {}),
  };
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
