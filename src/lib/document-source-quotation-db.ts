import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Lien facture → devis d'origine (conversion devis → facture).
 * Colonne `documents."sourceQuotationId"` lue / écrite en SQL brut : si la
 * migration n'est pas encore appliquée, tout continue de fonctionner (sans lien).
 */

function isMissingColumn(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /sourceQuotationId/i.test(msg) &&
    /does not exist|n'existe pas|42703|P2022/i.test(msg)
  );
}

export type ConvertedInvoiceRef = {
  id: string;
  number: string;
  status: string;
};

export async function persistSourceQuotation(
  invoiceId: string,
  quotationId: string,
): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "documents" SET "sourceQuotationId" = ${quotationId} WHERE id = ${invoiceId}
    `;
  } catch (err) {
    if (isMissingColumn(err)) return;
    throw err;
  }
}

/**
 * Factures issues de chaque devis (hors factures annulées), la plus récente d'abord.
 * Clé = id du devis.
 */
export async function loadConvertedInvoices(
  quotationIds: string[],
): Promise<Map<string, ConvertedInvoiceRef>> {
  const map = new Map<string, ConvertedInvoiceRef>();
  if (quotationIds.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<
      { id: string; number: string; status: string; sourceQuotationId: string }[]
    >`
      SELECT id, number, status::text AS status, "sourceQuotationId"
      FROM "documents"
      WHERE type = 'invoice'
        AND status <> 'cancelled'
        AND "sourceQuotationId" IN (${Prisma.join(quotationIds)})
      ORDER BY "createdAt" DESC
    `;
    for (const row of rows) {
      if (!map.has(row.sourceQuotationId)) {
        map.set(row.sourceQuotationId, {
          id: row.id,
          number: row.number,
          status: row.status,
        });
      }
    }
  } catch (err) {
    if (isMissingColumn(err)) return map;
    throw err;
  }
  return map;
}
