import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session.functions";
import { isAdmin } from "@/lib/roles";
import {
  EXPORT_PERIOD_MONTHS,
  exportDateRange,
  exportDocumentWhere,
} from "@/lib/document-export-config";
import {
  mapExportJob,
  processDocumentExportJob,
  type DocumentExportJobView,
} from "@/lib/document-export";

async function requireAdminSession() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  if (!isAdmin(session.staff.role)) {
    throw new Error("Réservé aux administrateurs");
  }
  return session;
}

const createExportSchema = z.object({
  format: z.enum(["zip", "csv", "both"]),
  documentType: z.enum(["invoice", "quotation", "letter"]).optional(),
  clientId: z.string().optional(),
  months: z
    .number()
    .int()
    .refine((m) => (EXPORT_PERIOD_MONTHS as readonly number[]).includes(m), {
      message: "Période invalide",
    }),
  documentIds: z.array(z.string().min(1)).min(1, "Sélectionnez au moins un document"),
});

export type ExportPreviewDocument = {
  id: string;
  number: string;
  type: "invoice" | "quotation" | "letter";
  status: string;
  clientName: string;
  issueDate: string;
  total: number | null;
  hasPdf: boolean;
};

async function expireStaleExportJobs(cabinet: string) {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  await prisma.documentExportJob.updateMany({
    where: {
      cabinet,
      status: { in: ["pending", "processing"] },
      createdAt: { lt: cutoff },
    },
    data: {
      status: "failed",
      errorMessage: "Export interrompu (délai dépassé). Relancez un nouvel export.",
      completedAt: new Date(),
    },
  });
}

export const createDocumentExportJob = createServerFn({ method: "POST" })
  .validator(createExportSchema)
  .handler(async ({ data }): Promise<DocumentExportJobView> => {
    const session = await requireAdminSession();
    const { dateFrom, dateTo } = exportDateRange(data.months);

    if (data.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: data.clientId, cabinet: session.activeCabinet },
        select: { id: true },
      });
      if (!client) throw new Error("Client introuvable");
    }

    const job = await prisma.documentExportJob.create({
      data: {
        cabinet: session.activeCabinet,
        createdById: session.staff.id,
        format: data.format,
        documentType: data.documentType ?? null,
        clientId: data.clientId ?? null,
        months: data.months,
        dateFrom,
        dateTo,
      },
      include: { client: { select: { name: true } } },
    });

    await processDocumentExportJob(job.id, data.documentIds);

    const done = await prisma.documentExportJob.findUniqueOrThrow({
      where: { id: job.id },
      include: { client: { select: { name: true } } },
    });
    return mapExportJob(done);
  });

export const getDocumentExportJob = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }): Promise<DocumentExportJobView> => {
    const session = await requireAdminSession();
    const job = await prisma.documentExportJob.findFirst({
      where: {
        id: data.id,
        cabinet: session.activeCabinet,
      },
      include: { client: { select: { name: true } } },
    });
    if (!job) throw new Error("Export introuvable");
    return mapExportJob(job);
  });

export const listDocumentExportJobs = createServerFn({ method: "GET" })
  .handler(async (): Promise<DocumentExportJobView[]> => {
    const session = await requireAdminSession();
    await expireStaleExportJobs(session.activeCabinet);
    const rows = await prisma.documentExportJob.findMany({
      where: { cabinet: session.activeCabinet },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { client: { select: { name: true } } },
    });
    return rows.map(mapExportJob);
  });

export const dismissDocumentExportJob = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const session = await requireAdminSession();
    const job = await prisma.documentExportJob.findFirst({
      where: { id: data.id, cabinet: session.activeCabinet },
      select: { id: true, status: true },
    });
    if (!job) throw new Error("Export introuvable");
    if (job.status === "processing") {
      throw new Error("Export en cours — patientez avant de retirer.");
    }
    await prisma.documentExportJob.delete({ where: { id: job.id } });
    return { ok: true };
  });

export const listDocumentExportPreview = createServerFn({ method: "GET" })
  .validator(
    z.object({
      documentType: z.enum(["invoice", "quotation", "letter"]).optional(),
      clientId: z.string().optional(),
      months: z.number().int(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireAdminSession();
    const { dateFrom, dateTo } = exportDateRange(data.months);
    const typeFilter = exportDocumentWhere(data.documentType);

    const rows = await prisma.document.findMany({
      where: {
        cabinet: session.activeCabinet,
        issueDate: { gte: dateFrom, lte: dateTo },
        ...(data.clientId ? { clientId: data.clientId } : {}),
        ...typeFilter,
      },
      include: {
        client: { select: { name: true } },
        pdfTraces: { take: 1, orderBy: { createdAt: "desc" }, select: { id: true } },
      },
      orderBy: [{ issueDate: "desc" }, { number: "asc" }],
    });

    const { decimalToNumber } = await import("@/lib/mappers");

    const documents: ExportPreviewDocument[] = rows.map((doc) => ({
      id: doc.id,
      number: doc.number,
      type: doc.type,
      status: doc.status,
      clientName: doc.client.name,
      issueDate: doc.issueDate.toISOString().slice(0, 10),
      total:
        doc.type === "letter" ? null : decimalToNumber(doc.total),
      hasPdf: doc.pdfTraces.length > 0,
    }));

    return {
      dateFrom: dateFrom.toISOString().slice(0, 10),
      dateTo: dateTo.toISOString().slice(0, 10),
      documents,
    };
  });

export const previewDocumentExportCount = createServerFn({ method: "GET" })
  .validator(
    z.object({
      documentType: z.enum(["invoice", "quotation", "letter"]).optional(),
      clientId: z.string().optional(),
      months: z.number().int(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireAdminSession();
    const { dateFrom, dateTo } = exportDateRange(data.months);
    const typeFilter = exportDocumentWhere(data.documentType);

    const count = await prisma.document.count({
      where: {
        cabinet: session.activeCabinet,
        issueDate: { gte: dateFrom, lte: dateTo },
        ...(data.clientId ? { clientId: data.clientId } : {}),
        ...typeFilter,
      },
    });

    return {
      count,
      dateFrom: dateFrom.toISOString().slice(0, 10),
      dateTo: dateTo.toISOString().slice(0, 10),
    };
  });
