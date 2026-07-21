import type { StaffPayload } from "@/lib/auth-schemas";

export type SyncStaffInput = StaffPayload & { id: string; role?: "member" | "admin" };

export function staffFromAuthUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): SyncStaffInput {
  const meta = user.user_metadata ?? {};
  const staffMeta = meta.staff as
    | {
        firstName?: string;
        lastName?: string;
        jobTitle?: string;
        phone?: string | null;
      }
    | undefined;

  const fullName = (meta.full_name as string | undefined) ?? "";
  const parts = fullName.trim().split(/\s+/);

  return {
    id: user.id,
    email: user.email ?? (meta.email as string) ?? "",
    firstName:
      staffMeta?.firstName ??
      (meta.first_name as string | undefined) ??
      parts[0] ??
      "Collaborateur",
    lastName:
      staffMeta?.lastName ??
      (meta.last_name as string | undefined) ??
      parts.slice(1).join(" ") ??
      "",
    jobTitle:
      staffMeta?.jobTitle ?? (meta.job_title as string | undefined) ?? "Membre",
    phone: staffMeta?.phone ?? (meta.phone as string | undefined) ?? null,
  };
}
