import { prisma } from "@/lib/prisma";
import { docInclude, mappedDocument } from "@/lib/data.functions";
import { companyForPreview } from "@/lib/company-defaults";
import { mapClient } from "@/lib/mappers";
import type { PrintPayload } from "@/lib/pdf/print-types";

export type { PrintPayload };

/**
 * Charge tout ce qu’il faut pour afficher l’aperçu d’un document sans session.
 * Utilisé uniquement par la page d’impression (jeton signé) et son API.
 */
export async function loadPrintPayload(documentId: string): Promise<PrintPayload> {
  const row = await prisma.document.findUnique({
    where: { id: documentId },
    include: docInclude,
  });
  if (!row) throw new Error("Document introuvable");

  const doc = await mappedDocument(row);
  const companyRow = await prisma.company.findUnique({
    where: { cabinet: row.cabinet },
  });

  return {
    doc,
    company: companyForPreview(companyRow, row.cabinet),
    client: row.client ? mapClient(row.client) : null,
  };
}
