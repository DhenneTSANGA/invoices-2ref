import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parseLineQuantityUnit,
  type LineQuantityUnit,
} from "@/lib/line-quantity";

type QuantityDb = {
  documentLine: {
    findMany: (typeof prisma)["documentLine"]["findMany"];
  };
  $executeRaw: (typeof prisma)["$executeRaw"];
};

export async function persistLineQuantityUnits(
  rows: { id: string; quantityUnit: LineQuantityUnit }[],
  db: Pick<QuantityDb, "$executeRaw"> = prisma,
) {
  for (const row of rows) {
    await db.$executeRaw`
      UPDATE "document_lines" SET "quantityUnit" = ${row.quantityUnit} WHERE id = ${row.id}
    `;
  }
}

export async function loadLineQuantityUnits(
  ids: string[],
): Promise<Map<string, LineQuantityUnit>> {
  const map = new Map<string, LineQuantityUnit>();
  if (ids.length === 0) return map;
  const rows = await prisma.$queryRaw<{ id: string; quantityUnit: string }[]>`
    SELECT id, "quantityUnit"
    FROM "document_lines"
    WHERE id IN (${Prisma.join(ids)})
  `;
  for (const row of rows) {
    map.set(row.id, parseLineQuantityUnit(row.quantityUnit));
  }
  return map;
}

export async function persistLineQuantityUnitsForDocument(
  documentId: string,
  unitsByPosition: LineQuantityUnit[],
  db: QuantityDb = prisma,
) {
  if (unitsByPosition.length === 0) return;
  const created = await db.documentLine.findMany({
    where: { documentId },
    select: { id: true, position: true },
    orderBy: { position: "asc" },
  });
  await persistLineQuantityUnits(
    created.map((row, i) => ({
      id: row.id,
      quantityUnit: unitsByPosition[i] ?? "quantity",
    })),
    db,
  );
}
