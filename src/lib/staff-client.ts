import type { StaffPayload } from "@/lib/auth-schemas";

export async function syncStaffToDatabase(payload: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone?: string | null;
  avatarUrl?: string | null;
  cabinet?: "conseil" | "expertise_fiscale" | null;
  role?: "member" | "admin" | "super_admin";
}) {
  const res = await fetch("/api/staff/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string; staff?: unknown };
  if (!res.ok) throw new Error(data.error ?? `Sync staff échouée (${res.status})`);
  return data.staff;
}

export async function syncStaffFromSignup(id: string, staff: StaffPayload) {
  return syncStaffToDatabase({
    id,
    email: staff.email,
    firstName: staff.firstName,
    lastName: staff.lastName,
    jobTitle: staff.jobTitle,
    phone: staff.phone ?? null,
    avatarUrl: staff.avatarUrl ?? null,
    cabinet: staff.cabinet ?? null,
    role: "member",
  });
}
