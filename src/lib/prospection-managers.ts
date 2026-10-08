import type { ClientPole } from "@/lib/client-pole";
import { isClientPole } from "@/lib/client-pole";
import type { Manager, ServiceLine } from "@/lib/prospection-demo";
import { canAccessSpace, type StaffSpacesAllowed } from "@/lib/app-space";
import type { AppRole } from "@/lib/roles";

/** Anciens ids démo — remappés vers le staff réel au chargement CRM. */
export const FAKE_MANAGER_IDS = ["mgr-awa", "mgr-jean", "mgr-nadege"] as const;

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
}): Manager {
  return {
    id: staff.id,
    name: staffDisplayName(staff),
    lines: linesFromStaffPole(staff.pole),
  };
}

export function isProspectionAssignableStaff(staff: {
  role: AppRole;
  spacesAllowed?: StaffSpacesAllowed | null;
}): boolean {
  return canAccessSpace(staff, "prospection");
}

export function resolveManagerName(id: string, managers: Manager[]): string {
  if (!id?.trim()) return "—";
  const hit = managers.find((m) => m.id === id);
  if (hit) return hit.name;
  if ((FAKE_MANAGER_IDS as readonly string[]).includes(id)) {
    return "Ancien manager (à réassigner)";
  }
  return "Collaborateur";
}
