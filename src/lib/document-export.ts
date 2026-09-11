import JSZip from "jszip";
import type {
  DocumentExportFormat,
  DocumentStatus,
  DocumentType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/mappers";
import {
  documentStatusLabel,
  documentTypeLabel,
} from "@/lib/document-status-labels";
import { exportDocumentWhere } from "@/lib/document-export-config";
import {
  downloadBytesFromPublicUrl,
  uploadExportBytes,
} from "@/lib/document-export-storage";
import { sanitizeFileName } from "@/lib/client-fiches-storage";

type CsvRow = {
  number: string;
  type: string;
  client: string;
  issueDate: string;
  subtotal: number;
  total: number;
  status: string;
  pdfAvailable: string;
};

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildCsv(rows: CsvRow[]): Buffer {
  const header = [
    "Numéro",
    "Type",
    "Client",
    "Date",
    "Montant HT",
    "Montant TTC",
    "Statut",
    "PDF disponible",
  ];
  const lines = [
    header.map(csvEscape).join(";"),
    ...rows.map((r) =>
      [
        r.number,
        r.type,
        r.client,
        r.issueDate,
        r.subtotal.toFixed(2),
        r.total.toFixed(2),
        r.status,
        r.pdfAvailable,
      ]
        .map((v) => csvEscape(String(v)))
        .join(";"),
    ),
  ];
  return Buffer.from(`\uFEFF${lines.join("\r\n")}`, "utf-8");
}

async function latestPdfTracesByDocument(
  documentIds: string[],
): Promise<Map<string, { fileUrl: string; fileName: string }>> {
  if (documentIds.length === 0) return new Map();
  const traces = await prisma.documentPdfTrace.findMany({
    where: { documentId: { in: documentIds } },
    orderBy: { createdAt: "desc" },
    select: { documentId: true, fileUrl: true, fileName: true },
  });
  const map = new Map<string, { fileUrl: string; fileName: string }>();
  for (const trace of traces) {
    if (!map.has(trace.documentId)) {
      map.set(trace.documentId, {
        fileUrl: trace.fileUrl,
        fileName: trace.fileName,
      });
    }
  }
  return map;
}

export async function processDocumentExportJob(
  jobId: string,
  documentIds?: string[],
): Promise<void> {
  const job = await prisma.documentExportJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  await prisma.documentExportJob.update({
    where: { id: jobId },
    data: { status: "processing", progress: 0, errorMessage: null },
  });

  try {
    const typeFilter = exportDocumentWhere(job.documentType);
    const documents = await prisma.document.findMany({
      where: {
        cabinet: job.cabinet,
        ...(documentIds?.length
          ? { id: { in: documentIds } }
          : {
              issueDate: { gte: job.dateFrom, lte: job.dateTo },
              ...(job.clientId ? { clientId: job.clientId } : {}),
            }),
        ...typeFilter,
      },
      include: {
        client: { select: { name: true } },
      },
      orderBy: [{ issueDate: "asc" }, { number: "asc" }],
    });

    await prisma.documentExportJob.update({
      where: { id: jobId },
      data: { total: documents.length },
    });

    const pdfMap = await latestPdfTracesByDocument(documents.map((d) => d.id));
    const csvRows: CsvRow[] = [];
    const zip = new JSZip();
    let skippedCount = 0;

    const wantsZip = job.format === "zip" || job.format === "both";
    const wantsCsv = job.format === "csv" || job.format === "both";

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i]!;
      const trace = pdfMap.get(doc.id);
      const subtotal = decimalToNumber(doc.subtotal);
      const total = decimalToNumber(doc.total);
      const typeLabel = documentTypeLabel(doc.type as DocumentType);
      const statusLabel = documentStatusLabel(doc.status as DocumentStatus);

      if (trace && wantsZip) {
        try {
          const bytes = await downloadBytesFromPublicUrl(trace.fileUrl);
          const baseName =
            sanitizeFileName(trace.fileName).replace(/\.pdf$/i, "") ||
            sanitizeFileName(doc.number);
          zip.file(`${baseName}.pdf`, bytes);
        } catch {
          skippedCount++;
        }
      } else if (wantsZip && !trace) {
        skippedCount++;
      }

      csvRows.push({
        number: doc.number,
        type: typeLabel,
        client: doc.client.name,
        issueDate: doc.issueDate.toISOString().slice(0, 10),
        subtotal,
        total,
        status: statusLabel,
        pdfAvailable: trace ? "Oui" : "Non",
      });

      if ((i + 1) % 3 === 0 || i === documents.length - 1) {
        await prisma.documentExportJob.update({
          where: { id: jobId },
          data: { progress: i + 1 },
        });
      }
    }

    let zipUrl: string | null = null;
    let zipPath: string | null = null;
    let csvUrl: string | null = null;
    let csvPath: string | null = null;

    if (wantsZip) {
      const zipBytes = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      const stamp = job.dateFrom.toISOString().slice(0, 10);
      const uploaded = await uploadExportBytes({
        cabinet: job.cabinet,
        jobId,
        fileName: `bilan-${stamp}-${job.id.slice(-6)}.zip`,
        bytes: zipBytes,
        contentType: "application/zip",
      });
      zipUrl = uploaded.fileUrl;
      zipPath = uploaded.path;
    }

    if (wantsCsv) {
      const csvBytes = buildCsv(csvRows);
      const stamp = job.dateFrom.toISOString().slice(0, 10);
      const uploaded = await uploadExportBytes({
        cabinet: job.cabinet,
        jobId,
        fileName: `bilan-${stamp}-${job.id.slice(-6)}.csv`,
        bytes: csvBytes,
        contentType: "text/csv;charset=utf-8",
      });
      csvUrl = uploaded.fileUrl;
      csvPath = uploaded.path;
    }

    await prisma.documentExportJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        progress: documents.length,
        skippedCount,
        zipUrl,
        zipPath,
        csvUrl,
        csvPath,
        completedAt: new Date(),
        errorMessage:
          skippedCount > 0
            ? `${skippedCount} PDF(s) absent(s) en base — regénérez-les depuis chaque document si besoin.`
            : null,
      },
    });
  } catch (err) {
    await prisma.documentExportJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Export impossible",
        completedAt: new Date(),
      },
    });
  }
}

export type DocumentExportJobView = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  format: DocumentExportFormat;
  documentType: DocumentType | null;
  clientId: string | null;
  clientName: string | null;
  months: number;
  dateFrom: string;
  dateTo: string;
  progress: number;
  total: number;
  skippedCount: number;
  zipUrl: string | null;
  csvUrl: string | null;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
};

export function mapExportJob(row: {
  id: string;
  status: DocumentExportJobView["status"];
  format: DocumentExportFormat;
  documentType: DocumentType | null;
  clientId: string | null;
  months: number;
  dateFrom: Date;
  dateTo: Date;
  progress: number;
  total: number;
  skippedCount: number;
  zipUrl: string | null;
  csvUrl: string | null;
  errorMessage: string | null;
  completedAt: Date | null;
  createdAt: Date;
  client?: { name: string } | null;
}): DocumentExportJobView {
  return {
    id: row.id,
    status: row.status,
    format: row.format,
    documentType: row.documentType,
    clientId: row.clientId,
    clientName: row.client?.name ?? null,
    months: row.months,
    dateFrom: row.dateFrom.toISOString().slice(0, 10),
    dateTo: row.dateTo.toISOString().slice(0, 10),
    progress: row.progress,
    total: row.total,
    skippedCount: row.skippedCount,
    zipUrl: row.zipUrl,
    csvUrl: row.csvUrl,
    errorMessage: row.errorMessage,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
