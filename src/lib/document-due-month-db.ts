import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function persistShowDueMonthOnLines(id: string, value: boolean) {
  await prisma.$executeRaw`
    UPDATE "documents" SET "showDueMonthOnLines" = ${value} WHERE id = ${id}
  `;
}

export async function loadShowDueMonthOnLines(
  ids: string[],
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (ids.length === 0) return map;
  const rows = await prisma.$queryRaw<{ id: string; showDueMonthOnLines: boolean }[]>`
    SELECT id, "showDueMonthOnLines"
    FROM "documents"
    WHERE id IN (${Prisma.join(ids)})
  `;
  for (const row of rows) {
    map.set(row.id, Boolean(row.showDueMonthOnLines));
  }
  return map;
}

export function withDueMonthFlag<T extends { id: string; showDueMonthOnLines?: boolean }>(
  doc: T,
  flags: Map<string, boolean>,
): T {
  return {
    ...doc,
    showDueMonthOnLines: flags.get(doc.id) ?? doc.showDueMonthOnLines ?? false,
  };
}
