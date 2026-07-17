export type SyncStaffInput = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role?: "member" | "admin";
};

/** Extrait les infos collab. depuis un user Supabase Auth (safe client). */
export function staffFromAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): SyncStaffInput | null {
  if (!user.id || !user.email) return null;

  const meta = user.user_metadata ?? {};
  const staffMeta = meta.staff as
    | {
        firstName?: string;
        lastName?: string;
        jobTitle?: string;
        phone?: string;
        email?: string;
      }
    | undefined;

  const fullName =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  return {
    id: user.id,
    email: user.email,
    firstName:
      staffMeta?.firstName ??
      (meta.first_name as string | undefined) ??
      (meta.given_name as string | undefined) ??
      parts[0] ??
      "Collaborateur",
    lastName:
      staffMeta?.lastName ??
      (meta.last_name as string | undefined) ??
      (meta.family_name as string | undefined) ??
      parts.slice(1).join(" ") ??
      "2REF",
    jobTitle:
      staffMeta?.jobTitle ??
      (meta.job_title as string | undefined) ??
      "Collaborateur",
    phone: staffMeta?.phone ?? (meta.phone as string | undefined) ?? null,
    avatarUrl:
      (meta.avatar_url as string | undefined) ??
      (meta.picture as string | undefined) ??
      null,
  };
}
