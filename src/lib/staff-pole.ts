import {
  parseClientPole,
  type ClientPole,
} from "@/lib/client-pole";
import { isMember } from "@/lib/roles";
import type { StaffMember } from "@/store/types";

/** Pôle attribué (admin et membre). Null pour le super admin. */
export function staffAssignedPole(
  staff: Pick<StaffMember, "role" | "pole"> | null | undefined,
): ClientPole | null {
  if (!staff || staff.role === "super_admin") return null;
  return parseClientPole(staff.pole);
}

/**
 * Pôle qui restreint les listes / fiches.
 * Admin et super admin : pas de restriction (cabinet / tous les cabinets).
 */
export function memberVisibilityPole(
  staff: Pick<StaffMember, "role" | "pole"> | null | undefined,
): ClientPole | null {
  if (!staff || !isMember(staff.role)) return null;
  return parseClientPole(staff.pole);
}

export function memberCanSeePole(
  staff: Pick<StaffMember, "role" | "pole"> | null | undefined,
  pole: unknown,
): boolean {
  const scoped = memberVisibilityPole(staff);
  return !scoped || scoped === parseClientPole(pole);
}

export function assertMemberCanAccessPole(
  staff: Pick<StaffMember, "role" | "pole">,
  pole: unknown,
) {
  if (!memberCanSeePole(staff, pole)) {
    throw new Error("Accès limité à votre pôle");
  }
}

export function filterByMemberPole<T extends { pole?: ClientPole | null }>(
  staff: Pick<StaffMember, "role" | "pole">,
  items: T[],
): T[] {
  const scoped = memberVisibilityPole(staff);
  if (!scoped) return items;
  return items.filter((item) => parseClientPole(item.pole) === scoped);
}

/** Pôle écrit en base : forcé pour un membre, sinon celui du formulaire. */
export function resolveStaffWritePole(
  staff: Pick<StaffMember, "role" | "pole">,
  requested: unknown,
): ClientPole {
  return memberVisibilityPole(staff) ?? parseClientPole(requested);
}
