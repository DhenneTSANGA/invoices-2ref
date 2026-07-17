import { prisma } from "@/lib/prisma";
import type { SyncStaffInput } from "@/lib/staff-parse";

export type { SyncStaffInput } from "@/lib/staff-parse";
export { staffFromAuthUser } from "@/lib/staff-parse";

/** Écrit / met à jour le collaborateur dans `staff_members` (table métier). */
export async function syncStaffMember(input: SyncStaffInput) {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  const avatarUrl = input.avatarUrl?.trim() || null;
  const firstName = input.firstName.trim() || "Collaborateur";
  const lastName = input.lastName.trim() || "2REF";
  const jobTitle = input.jobTitle.trim() || "Collaborateur";

  if (!input.id || !email) {
    throw new Error("id et email requis pour synchroniser le collaborateur");
  }

  return prisma.staffMember.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      email,
      firstName,
      lastName,
      jobTitle,
      phone,
      avatarUrl,
      role: input.role ?? "member",
    },
    update: {
      email,
      firstName,
      lastName,
      jobTitle,
      ...(phone !== null ? { phone } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
    },
  });
}
