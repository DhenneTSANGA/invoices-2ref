import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parseClientPole,
  type ClientPole,
} from "@/lib/client-pole";

export async function persistClientPole(id: string, pole: ClientPole) {
  const value = parseClientPole(pole);
  await prisma.$executeRaw`
    UPDATE "clients"
    SET pole = CAST(${value} AS "ClientPole")
    WHERE id = ${id}
  `;
}

export async function persistDocumentPole(id: string, pole: ClientPole) {
  const value = parseClientPole(pole);
  await prisma.$executeRaw`
    UPDATE "documents"
    SET pole = CAST(${value} AS "ClientPole")
    WHERE id = ${id}
  `;
}

export async function loadClientPoles(
  ids: string[],
): Promise<Map<string, ClientPole>> {
  const map = new Map<string, ClientPole>();
  if (ids.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<{ id: string; pole: string }[]>`
      SELECT id, pole::text AS pole
      FROM "clients"
      WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) map.set(row.id, parseClientPole(row.pole));
  } catch {
    /* colonne absente tant que la migration n’est pas appliquée */
  }
  return map;
}

export async function loadDocumentPoles(
  ids: string[],
): Promise<Map<string, ClientPole>> {
  const map = new Map<string, ClientPole>();
  if (ids.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<{ id: string; pole: string }[]>`
      SELECT id, pole::text AS pole
      FROM "documents"
      WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) map.set(row.id, parseClientPole(row.pole));
  } catch {
    /* colonne absente tant que la migration n’est pas appliquée */
  }
  return map;
}

export function withClientPole<T extends { id: string; pole?: ClientPole }>(
  row: T,
  poles: Map<string, ClientPole>,
): T {
  return { ...row, pole: poles.get(row.id) ?? parseClientPole(row.pole) };
}
