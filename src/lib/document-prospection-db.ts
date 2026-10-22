import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapStaff } from "@/lib/mappers";
import { cabinetPortfolioManagers } from "@/lib/crm-daily-digest";
import { staffDisplayName } from "@/lib/prospection-managers";
import type { Cabinet } from "@/lib/cabinets";

/**
 * Lien Facturation → Prospection : manager apporteur d’une facture et date
 * d’encaissement. Colonnes lues et écrites en SQL (tolère une base pas encore migrée).
 */

function isColumnMissing(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /prospectionManagerId|paidAt/i.test(msg) && /does not exist|n'existe pas|42703|P2022/i.test(msg);
}

export type InvoiceProspectionInfo = { managerId: string | null; paidAt: string | null };

/** Manager apporteur (celui de la facture d’abonnement d’origine à défaut) et date d’encaissement. */
export async function loadInvoiceProspectionInfo(
  ids: string[],
): Promise<Map<string, InvoiceProspectionInfo>> {
  const map = new Map<string, InvoiceProspectionInfo>();
  if (ids.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<
      { id: string; managerId: string | null; paidAt: Date | null }[]
    >`
      SELECT d.id,
             COALESCE(d."prospectionManagerId", p."prospectionManagerId") AS "managerId",
             d."paidAt" AS "paidAt"
      FROM "documents" d
      LEFT JOIN "documents" p ON p.id = d."subscriptionOfId"
      WHERE d.id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) {
      map.set(row.id, {
        managerId: row.managerId,
        paidAt: row.paidAt ? row.paidAt.toISOString() : null,
      });
    }
  } catch (err) {
    if (isColumnMissing(err)) return map;
    throw err;
  }
  return map;
}

export async function persistInvoiceProspectionManager(id: string, managerId: string | null) {
  try {
    await prisma.$executeRaw`
      UPDATE "documents" SET "prospectionManagerId" = ${managerId} WHERE id = ${id}
    `;
  } catch (err) {
    if (isColumnMissing(err)) return;
    throw err;
  }
}

/** Date d’encaissement posée au passage en « payée », retirée si la facture n’est plus payée. */
export async function syncInvoicePaidAt(id: string) {
  try {
    await prisma.$executeRaw`
      UPDATE "documents"
      SET "paidAt" = CASE WHEN "status" = 'paid' THEN COALESCE("paidAt", NOW()) ELSE NULL END
      WHERE id = ${id} AND "type" = 'invoice'
    `;
  } catch (err) {
    if (isColumnMissing(err)) return;
    throw err;
  }
}

export type ManagerInvoice = {
  managerId: string;
  total: number;
  deposit: number;
  status: string;
  paidAt: Date | null;
};

/** Factures rattachées à ces managers (en propre ou via l’abonnement d’origine), hors annulées. */
export async function loadManagerInvoices(managerIds: string[], cabinet: Cabinet): Promise<ManagerInvoice[]> {
  if (managerIds.length === 0) return [];
  try {
    const rows = await prisma.$queryRaw<
      { managerId: string; total: number; deposit: number; status: string; paidAt: Date | null }[]
    >`
      SELECT COALESCE(d."prospectionManagerId", p."prospectionManagerId") AS "managerId",
             d."total"::float8 AS "total",
             d."deposit"::float8 AS "deposit",
             d."status"::text AS "status",
             d."paidAt" AS "paidAt"
      FROM "documents" d
      LEFT JOIN "documents" p ON p.id = d."subscriptionOfId"
      WHERE d."type" = 'invoice'
        AND d."cabinet"::text = ${cabinet}
        AND d."status"::text IN ('paid', 'sent', 'overdue', 'signed')
        AND COALESCE(d."prospectionManagerId", p."prospectionManagerId") IN (${Prisma.join(managerIds)})
    `;
    return rows;
  } catch (err) {
    if (isColumnMissing(err)) return [];
    throw err;
  }
}

export type ProspectionManagerOption = { id: string; name: string };

/** Managers Prospection proposables sur une facture du cabinet. */
export async function loadInvoiceManagerOptions(cabinet: Cabinet): Promise<ProspectionManagerOption[]> {
  const staff = (await prisma.staffMember.findMany({ orderBy: [{ lastName: "asc" }] })).map(mapStaff);
  return cabinetPortfolioManagers(staff, cabinet).map((s) => ({ id: s.id, name: staffDisplayName(s) }));
}

export async function assertInvoiceManagerAllowed(managerId: string | null, cabinet: Cabinet) {
  if (!managerId) return;
  const options = await loadInvoiceManagerOptions(cabinet);
  if (!options.some((o) => o.id === managerId)) {
    throw new Error("Ce manager n’appartient pas à la Prospection de ce cabinet.");
  }
}
