import type { DocumentStatus, DocumentType } from "@/store/types";
import type { Prisma } from "@prisma/client";

/** Statuts éligibles à l'export Bilan par type de document. */
export const EXPORTABLE_STATUSES: Record<DocumentType, DocumentStatus[]> = {
  invoice: ["paid", "archived"],
  quotation: ["accepted", "archived"],
  letter: ["signed", "sent", "archived"],
};

export const EXPORT_PERIOD_MONTHS = [1, 2, 3, 6, 12] as const;
export type ExportPeriodMonths = (typeof EXPORT_PERIOD_MONTHS)[number];

export function exportDateRange(months: number, ref = new Date()): {
  dateFrom: Date;
  dateTo: Date;
} {
  // Aligner sur les dates @db.Date (minuit UTC du jour calendaire local).
  const dateTo = new Date(
    Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()),
  );
  const dateFrom = new Date(dateTo);
  dateFrom.setUTCMonth(dateFrom.getUTCMonth() - months);
  return { dateFrom, dateTo };
}

/** Filtre Prisma : statuts éligibles selon le type (ou tous les types). */
export function exportDocumentWhere(
  documentType?: DocumentType | null,
): Prisma.DocumentWhereInput {
  if (documentType) {
    return {
      type: documentType,
      status: { in: EXPORTABLE_STATUSES[documentType] },
    };
  }
  return {
    OR: (Object.entries(EXPORTABLE_STATUSES) as [DocumentType, DocumentStatus[]][]).map(
      ([type, statuses]) => ({
        type,
        status: { in: statuses },
      }),
    ),
  };
}
