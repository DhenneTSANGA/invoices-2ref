import type { AppRole } from "@/lib/roles";
import { facturationHomePath, isSuperAdmin } from "@/lib/roles";

export type AppSpace = "facturation" | "prospection";

export type StaffSpacesAllowed = "facturation" | "prospection" | "both";

const KEY = "2rhub-last-space";

export function rememberSpace(space: AppSpace) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, space);
  } catch {
    // ignore quota / private mode
  }
}

export function lastSpace(): AppSpace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "facturation" || raw === "prospection") return raw;
  } catch {
    // ignore
  }
  return null;
}

export function normalizeSpacesAllowed(
  value: StaffSpacesAllowed | string | null | undefined,
  role?: AppRole,
): StaffSpacesAllowed {
  if (role && isSuperAdmin(role)) return "both";
  if (value === "facturation" || value === "prospection" || value === "both") {
    return value;
  }
  return "facturation";
}

export function canAccessSpace(
  staff: { role: AppRole; spacesAllowed?: StaffSpacesAllowed | null },
  space: AppSpace,
): boolean {
  const spaces = normalizeSpacesAllowed(staff.spacesAllowed, staff.role);
  if (spaces === "both") return true;
  return spaces === space;
}

export function canChooseSpace(staff: {
  role: AppRole;
  spacesAllowed?: StaffSpacesAllowed | null;
}): boolean {
  return normalizeSpacesAllowed(staff.spacesAllowed, staff.role) === "both";
}

export type AppHomePath = "/hub" | "/prospection" | "/dashboard" | "/home";

/** Redirection post-login selon les espaces autorisés. */
export function homePathForStaff(staff: {
  role: AppRole;
  spacesAllowed?: StaffSpacesAllowed | null;
}): AppHomePath {
  const spaces = normalizeSpacesAllowed(staff.spacesAllowed, staff.role);
  if (spaces === "both") return "/hub";
  if (spaces === "prospection") return "/prospection";
  return facturationHomePath(staff.role);
}

export const SPACES_ALLOWED_LABELS: Record<StaffSpacesAllowed, string> = {
  facturation: "Facturation",
  prospection: "Prospection",
  both: "Les deux espaces",
};
