import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Adresses e-mail supplémentaires (colonne "extraEmails", SQL brut). */
export async function persistClientExtraEmails(id: string, emails: string[]) {
  try {
    await prisma.$executeRaw`
      UPDATE "clients" SET "extraEmails" = ${emails}::text[] WHERE id = ${id}
    `;
  } catch (err) {
    console.warn("[client extraEmails] migration non appliquée ?", err);
  }
}

export async function loadClientExtraEmails(
  ids: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (ids.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<{ id: string; extraEmails: string[] | null }[]>`
      SELECT id, "extraEmails"
      FROM "clients"
      WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) map.set(row.id, row.extraEmails ?? []);
  } catch {
    /* colonne absente tant que la migration n’est pas appliquée */
  }
  return map;
}

export function withExtraEmails<T extends { id: string; extraEmails?: string[] }>(
  row: T,
  extras: Map<string, string[]>,
): T {
  return { ...row, extraEmails: extras.get(row.id) ?? row.extraEmails ?? [] };
}
