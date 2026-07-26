import { Prisma } from "@prisma/client";
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

  const base = {
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    jobTitle,
    phone: input.phone ?? null,
    avatarUrl: input.avatarUrl ?? null,
    role,
  } as const;

  try {
    return await prisma.staffMember.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        ...base,
        cabinet,
      },
      update: {
        ...base,
        ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.cabinet !== undefined
          ? { cabinet: role === "super_admin" ? null : input.cabinet }
          : {}),
      },
    });
  } catch (err) {
    // Client Prisma obsolète (sans champ cabinet) : upsert minimal + UPDATE SQL.
    const msg = err instanceof Error ? err.message : String(err);
    if (
      !(err instanceof Prisma.PrismaClientValidationError) ||
      !msg.includes("Unknown argument `cabinet`")
    ) {
      throw err;
    }

    const row = await prisma.staffMember.upsert({
      where: { id: input.id },
      create: { id: input.id, ...base },
      update: {
        email: base.email,
        firstName: base.firstName,
        lastName: base.lastName,
        jobTitle: base.jobTitle,
        phone: base.phone,
        ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
      },
    });

    if (role === "super_admin") {
      await prisma.$executeRaw`
        UPDATE "staff_members" SET "cabinet" = NULL WHERE "id" = ${input.id}
      `;
    } else if (cabinet) {
      await prisma.$executeRaw`
        UPDATE "staff_members"
        SET "cabinet" = ${cabinet}::"Cabinet"
        WHERE "id" = ${input.id}
      `;
    }

    return (
      (await prisma.staffMember.findUnique({ where: { id: input.id } })) ?? row
    );
  }
}
