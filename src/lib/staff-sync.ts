import { prisma } from "@/lib/prisma";
import type { SyncStaffInput } from "@/lib/staff-parse";

export type { SyncStaffInput } from "@/lib/staff-parse";
export { staffFromAuthUser } from "@/lib/staff-parse";

export async function syncStaffMember(input: SyncStaffInput) {
  return prisma.staffMember.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      jobTitle: input.jobTitle,
      phone: input.phone ?? null,
      avatarUrl: input.avatarUrl ?? null,
      role: input.role ?? "member",
    },
    update: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      jobTitle: input.jobTitle,
      phone: input.phone ?? null,
      // Ne pas effacer une photo existante si le provider n'en renvoie pas (ex. magic link)
      ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
    },
  });
}
