import type { StaffPayload } from "@/lib/auth-schemas";
import { isCabinet } from "@/lib/cabinets";

export type SyncStaffInput = StaffPayload & {
  id: string;
  role?: "member" | "admin" | "super_admin";
};

function metaString(meta: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

/** Photo Google (OAuth) — Supabase expose souvent `avatar_url` ou `picture`. */
export function avatarFromAuthMetadata(
  meta: Record<string, unknown> | undefined,
): string | null {
  if (!meta) return null;
  return (
    metaString(meta, "avatar_url", "picture", "avatarUrl", "photo_url", "photoURL") ??
    null
  );
}

export function staffFromAuthUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  identities?: Array<{ identity_data?: Record<string, unknown> | null }> | null;
}): SyncStaffInput {
  const meta = user.user_metadata ?? {};
  const staffMeta = meta.staff as
    | {
        firstName?: string;
        lastName?: string;
        jobTitle?: string;
        phone?: string | null;
        avatarUrl?: string | null;
        cabinet?: string | null;
      }
    | undefined;

  const identityMeta =
    user.identities?.find((i) => i.identity_data)?.identity_data ?? undefined;

  const fullName = metaString(meta, "full_name", "name") ?? "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  const rawCabinet =
    staffMeta?.cabinet ?? metaString(meta, "cabinet") ?? null;
  const cabinet = isCabinet(rawCabinet) ? rawCabinet : null;

  return {
    id: user.id,
    email: user.email ?? metaString(meta, "email") ?? "",
    firstName:
      staffMeta?.firstName ??
      metaString(meta, "first_name", "given_name") ??
      parts[0] ??
      "Collaborateur",
    lastName:
      staffMeta?.lastName ??
      metaString(meta, "last_name", "family_name") ??
      parts.slice(1).join(" ") ??
      "",
    jobTitle:
      staffMeta?.jobTitle ?? metaString(meta, "job_title") ?? "service_commercial",
    phone: staffMeta?.phone ?? metaString(meta, "phone") ?? null,
    avatarUrl:
      staffMeta?.avatarUrl ??
      avatarFromAuthMetadata(meta) ??
      avatarFromAuthMetadata(identityMeta ?? undefined),
    cabinet,
  };
}
