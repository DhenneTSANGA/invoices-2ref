import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function persistDeposit(id: string, value: number) {
  const n = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  try {
    await prisma.$executeRaw`
      UPDATE "documents" SET "deposit" = ${n} WHERE id = ${id}
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/deposit/i.test(msg) && /does not exist|n'existe pas|42703|P2022/i.test(msg)) {
      return;
    }
    throw err;
  }
}

export async function loadDeposits(
  ids: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (ids.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<{ id: string; deposit: Prisma.Decimal | number }[]>`
      SELECT id, "deposit"
      FROM "documents"
      WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) {
      map.set(row.id, Math.max(0, Math.round(Number(row.deposit) || 0)));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/deposit/i.test(msg) && /does not exist|n'existe pas|42703|P2022/i.test(msg)) {
      return map;
    }
    throw err;
  }
  return map;
}

export function withDeposit<T extends { id: string; deposit?: number }>(
  doc: T,
  flags: Map<string, number>,
): T {
  return {
    ...doc,
    deposit: flags.get(doc.id) ?? doc.deposit ?? 0,
  };
}
