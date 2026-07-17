import type { StaffPayload } from "@/lib/auth-schemas";

/** Appelle l’API pour écrire dans `staff_members`. */
export async function syncStaffToDatabase(input: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role?: "member" | "admin";
}) {
  const res = await fetch("/api/staff/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    staff?: unknown;
  };

  if (!res.ok) {
    throw new Error(payload.error ?? `Sync staff échouée (${res.status})`);
  }

  return payload.staff;
}

export async function syncStaffFromSignup(
  userId: string,
  staff: StaffPayload,
) {
  return syncStaffToDatabase({
    id: userId,
    email: staff.email,
    firstName: staff.firstName,
    lastName: staff.lastName,
    jobTitle: staff.jobTitle,
    phone: staff.phone ?? null,
  });
}
