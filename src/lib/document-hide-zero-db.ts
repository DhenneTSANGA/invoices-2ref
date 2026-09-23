import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function persistHideZeroLineFigures(id: string, value: boolean) {
  await prisma.$executeRaw`
    UPDATE "documents" SET "hideZeroLineFigures" = ${value} WHERE id = ${id}
  `;
}

export async function loadHideZeroLineFigures(
  ids: string[],
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (ids.length === 0) return map;
  const rows = await prisma.$queryRaw<{ id: string; hideZeroLineFigures: boolean }[]>`
    SELECT id, "hideZeroLineFigures"
    FROM "documents"
    WHERE id IN (${Prisma.join(ids)})
  `;
  for (const row of rows) {
    map.set(row.id, Boolean(row.hideZeroLineFigures));
  }
  return map;
}

export function withHideZeroFlag<
  T extends { id: string; hideZeroLineFigures?: boolean },
>(doc: T, flags: Map<string, boolean>): T {
  return {
    ...doc,
    hideZeroLineFigures:
      flags.get(doc.id) ?? doc.hideZeroLineFigures ?? true,
  };
}
