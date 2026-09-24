import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parseClientPole,
  type ClientPole,
} from "@/lib/client-pole";
import type { StaffMember } from "@/store/types";

export async function persistStaffPole(
  id: string,
  pole: ClientPole | null,
) {
  if (pole === null) {
    await prisma.$executeRaw`
      UPDATE "staff_members"
      SET pole = NULL
      WHERE id = ${id}
    `;
    return;
  }
  const value = parseClientPole(pole);
  await prisma.$executeRaw`
    UPDATE "staff_members"
    SET pole = CAST(${value} AS "ClientPole")
    WHERE id = ${id}
  `;
}

export async function loadStaffPoles(
  ids: string[],
): Promise<Map<string, ClientPole>> {
  const map = new Map<string, ClientPole>();
  if (ids.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<{ id: string; pole: string | null }[]>`
      SELECT id, pole::text AS pole
      FROM "staff_members"
      WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) {
      if (row.pole) map.set(row.id, parseClientPole(row.pole));
    }
  } catch {
    /* colonne absente tant que la migration n’est pas appliquée */
  }
  return map;
}

export async function withLoadedStaffPole(
  staff: StaffMember,
): Promise<StaffMember> {
  if (staff.role === "super_admin") return { ...staff, pole: null };
  const poles = await loadStaffPoles([staff.id]);
  return {
    ...staff,
    pole: poles.get(staff.id) ?? parseClientPole(staff.pole),
  };
}

export async function withLoadedStaffPoles(
  rows: StaffMember[],
): Promise<StaffMember[]> {
  const poles = await loadStaffPoles(rows.map((r) => r.id));
  return rows.map((r) =>
    r.role === "super_admin"
      ? { ...r, pole: null }
      : { ...r, pole: poles.get(r.id) ?? parseClientPole(r.pole) },
  );
}
