import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function persistTotalRounding(id: string, value: number) {
  const n = Number.isFinite(value) ? Math.round(value) : 0;
  await prisma.$executeRaw`
    UPDATE "documents" SET "totalRounding" = ${n} WHERE id = ${id}
  `;
}

export async function loadTotalRounding(
  ids: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (ids.length === 0) return map;
  const rows = await prisma.$queryRaw<{ id: string; totalRounding: number }[]>`
    SELECT id, "totalRounding"
    FROM "documents"
    WHERE id IN (${Prisma.join(ids)})
  `;
  for (const row of rows) {
    map.set(row.id, Number(row.totalRounding) || 0);
  }
  return map;
}

export function withTotalRounding<T extends { id: string; totalRounding?: number }>(
  doc: T,
  flags: Map<string, number>,
): T {
  return {
    ...doc,
    totalRounding: flags.get(doc.id) ?? doc.totalRounding ?? 0,
  };
}
