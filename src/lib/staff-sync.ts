import { prisma } from "@/lib/prisma";
import { normalizeJobTitleValue } from "@/lib/cabinets";
import type { SyncStaffInput } from "@/lib/staff-parse";

export type { SyncStaffInput } from "@/lib/staff-parse";
export { staffFromAuthUser } from "@/lib/staff-parse";

export async function syncStaffMember(input: SyncStaffInput) {
  const role = input.role ?? "member";
  const cabinet =
    role === "super_admin" ? null : (input.cabinet ?? null);
  const jobTitle =
    normalizeJobTitleValue(input.jobTitle) ?? input.jobTitle.trim();

  return prisma.staffMember.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      jobTitle,
      phone: input.phone ?? null,
      avatarUrl: input.avatarUrl ?? null,
      role,
      cabinet,
    },
    update: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      jobTitle,
      phone: input.phone ?? null,
      ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.cabinet !== undefined
        ? { cabinet: role === "super_admin" ? null : input.cabinet }
        : {}),
    },
  });
}
