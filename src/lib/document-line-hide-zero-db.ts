import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type HideZeroDb = {
  documentLine: {
    findMany: (typeof prisma)["documentLine"]["findMany"];
  };
  $executeRaw: (typeof prisma)["$executeRaw"];
};

export async function persistLineHideZeroFigures(
  rows: { id: string; hideZeroFigures: boolean }[],
  db: Pick<HideZeroDb, "$executeRaw"> = prisma,
) {
  for (const row of rows) {
    await db.$executeRaw`
      UPDATE "document_lines" SET "hideZeroFigures" = ${row.hideZeroFigures} WHERE id = ${row.id}
    `;
  }
}

export async function loadLineHideZeroFigures(
  ids: string[],
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (ids.length === 0) return map;
  const rows = await prisma.$queryRaw<{ id: string; hideZeroFigures: boolean }[]>`
    SELECT id, "hideZeroFigures"
    FROM "document_lines"
    WHERE id IN (${Prisma.join(ids)})
  `;
  for (const row of rows) {
    map.set(row.id, Boolean(row.hideZeroFigures));
  }
  return map;
}

export async function persistLineHideZeroFiguresForDocument(
  documentId: string,
  flagsByPosition: boolean[],
  db: HideZeroDb = prisma,
) {
  if (flagsByPosition.length === 0) return;
  const created = await db.documentLine.findMany({
    where: { documentId },
    select: { id: true, position: true },
    orderBy: { position: "asc" },
  });
  await persistLineHideZeroFigures(
    created.map((row, i) => ({
      id: row.id,
      hideZeroFigures: flagsByPosition[i] ?? true,
    })),
    db,
  );
}
