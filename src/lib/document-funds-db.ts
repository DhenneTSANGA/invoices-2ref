import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DiscountMode, LineBillingKind } from "@/store/types";

type FundsDb = {
  documentLine: {
    findMany: (typeof prisma)["documentLine"]["findMany"];
  };
  $executeRaw: (typeof prisma)["$executeRaw"];
  $queryRaw: (typeof prisma)["$queryRaw"];
};

function isMissingColumn(err: unknown, column: string) {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    new RegExp(column, "i").test(msg) &&
    /does not exist|n'existe pas|42703|P2022/i.test(msg)
  );
}

export function parseBillingKind(value: unknown): LineBillingKind {
  return value === "funds" ? "funds" : "service";
}

export function parseDiscountMode(value: unknown): DiscountMode {
  return value === "amount" ? "amount" : "percent";
}

export async function persistLineBillingKinds(
  rows: { id: string; billingKind: LineBillingKind }[],
  db: Pick<FundsDb, "$executeRaw"> = prisma,
) {
  for (const row of rows) {
    try {
      await db.$executeRaw`
        UPDATE "document_lines" SET "billingKind" = ${row.billingKind} WHERE id = ${row.id}
      `;
    } catch (err) {
      if (isMissingColumn(err, "billingKind")) return;
      throw err;
    }
  }
}

export async function loadLineBillingKinds(
  ids: string[],
): Promise<Map<string, LineBillingKind>> {
  const map = new Map<string, LineBillingKind>();
  if (ids.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<{ id: string; billingKind: string }[]>`
      SELECT id, "billingKind"
      FROM "document_lines"
      WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) {
      map.set(row.id, parseBillingKind(row.billingKind));
    }
  } catch (err) {
    if (isMissingColumn(err, "billingKind")) return map;
    throw err;
  }
  return map;
}

export async function persistLineBillingKindsForDocument(
  documentId: string,
  kindsByPosition: LineBillingKind[],
  db: FundsDb = prisma,
) {
  if (kindsByPosition.length === 0) return;
  const created = await db.documentLine.findMany({
    where: { documentId },
    select: { id: true, position: true },
    orderBy: { position: "asc" },
  });
  await persistLineBillingKinds(
    created.map((row, i) => ({
      id: row.id,
      billingKind: kindsByPosition[i] ?? "service",
    })),
    db,
  );
}

export type DiscountChoice = {
  mode: DiscountMode;
  fixed: number;
};

export async function persistDiscountChoice(
  id: string,
  choice: DiscountChoice,
) {
  const mode = parseDiscountMode(choice.mode);
  const fixed = Number.isFinite(choice.fixed)
    ? Math.max(0, Math.round(choice.fixed))
    : 0;
  try {
    await prisma.$executeRaw`
      UPDATE "documents"
      SET "discountMode" = ${mode}, "discountFixed" = ${fixed}
      WHERE id = ${id}
    `;
  } catch (err) {
    if (isMissingColumn(err, "discountMode") || isMissingColumn(err, "discountFixed")) {
      return;
    }
    throw err;
  }
}

export async function loadDiscountChoices(
  ids: string[],
): Promise<Map<string, DiscountChoice>> {
  const map = new Map<string, DiscountChoice>();
  if (ids.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<
      { id: string; discountMode: string; discountFixed: Prisma.Decimal | number }[]
    >`
      SELECT id, "discountMode", "discountFixed"
      FROM "documents"
      WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) {
      map.set(row.id, {
        mode: parseDiscountMode(row.discountMode),
        fixed: Math.max(0, Math.round(Number(row.discountFixed) || 0)),
      });
    }
  } catch (err) {
    if (isMissingColumn(err, "discountMode") || isMissingColumn(err, "discountFixed")) {
      return map;
    }
    throw err;
  }
  return map;
}
