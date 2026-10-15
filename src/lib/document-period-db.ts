import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDocumentPeriod } from "@/lib/document-period";

function isPeriodColumnMissing(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /period/i.test(msg) && /does not exist|n'existe pas|42703|P2022/i.test(msg);
}

export async function persistDocumentPeriod(id: string, value: string | null | undefined) {
  const period = parseDocumentPeriod(value);
  try {
    await prisma.$executeRaw`
      UPDATE "documents" SET "period" = ${period} WHERE id = ${id}
    `;
  } catch (err) {
    if (isPeriodColumnMissing(err)) return;
    throw err;
  }
}

export async function loadDocumentPeriods(
  ids: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (ids.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<{ id: string; period: string | null }[]>`
      SELECT id, "period"
      FROM "documents"
      WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) {
      map.set(row.id, parseDocumentPeriod(row.period));
    }
  } catch (err) {
    if (isPeriodColumnMissing(err)) return map;
    throw err;
  }
  return map;
}

export function withDocumentPeriod<T extends { id: string; period?: string | null }>(
  doc: T,
  periods: Map<string, string | null>,
): T {
  return {
    ...doc,
    period: periods.has(doc.id) ? periods.get(doc.id)! : (doc.period ?? null),
  };
}
