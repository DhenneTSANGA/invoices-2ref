import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeExtraEmailContacts,
  type ClientEmailContact,
} from "@/lib/client-emails";

/**
 * Adresses e-mail supplémentaires (SQL brut) :
 * "extraEmailContacts" (e-mail + civilité + nom) et "extraEmails" (adresses seules,
 * gardé synchronisé pour compatibilité).
 */
export async function persistClientExtraEmails(id: string, contacts: ClientEmailContact[]) {
  const emails = contacts.map((c) => c.email);
  try {
    await prisma.$executeRaw`
      UPDATE "clients"
      SET "extraEmails" = ${emails}::text[],
          "extraEmailContacts" = ${JSON.stringify(contacts)}::jsonb
      WHERE id = ${id}
    `;
    return;
  } catch (err) {
    console.warn("[client extraEmailContacts] migration non appliquée ?", err);
  }
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
): Promise<Map<string, ClientEmailContact[]>> {
  const map = new Map<string, ClientEmailContact[]>();
  if (ids.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<
      { id: string; email: string; extraEmails: string[] | null; extraEmailContacts: unknown }[]
    >`
      SELECT id, email, "extraEmails", "extraEmailContacts"
      FROM "clients"
      WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) {
      const contacts = Array.isArray(row.extraEmailContacts)
        ? (row.extraEmailContacts as Partial<ClientEmailContact>[])
        : [];
      map.set(
        row.id,
        normalizeExtraEmailContacts(
          contacts.length
            ? contacts
            : (row.extraEmails ?? []).map((email) => ({ email })),
          row.email,
        ),
      );
    }
    return map;
  } catch {
    /* colonne "extraEmailContacts" absente : repli sur "extraEmails" */
  }
  try {
    const rows = await prisma.$queryRaw<{ id: string; email: string; extraEmails: string[] | null }[]>`
      SELECT id, email, "extraEmails" FROM "clients" WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) {
      map.set(
        row.id,
        normalizeExtraEmailContacts((row.extraEmails ?? []).map((email) => ({ email })), row.email),
      );
    }
  } catch {
    /* colonnes absentes tant que les migrations ne sont pas appliquées */
  }
  return map;
}

export function withExtraEmails<
  T extends { id: string; extraEmailContacts?: ClientEmailContact[] },
>(row: T, extras: Map<string, ClientEmailContact[]>): T {
  return { ...row, extraEmailContacts: extras.get(row.id) ?? row.extraEmailContacts ?? [] };
}
