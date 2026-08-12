import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Cabinet, DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPrismaError, isPrismaColumnMissing } from "@/lib/prisma-errors";
import { mapClient, mapDocument, mapService, mapCompany, mapNotification } from "@/lib/mappers";
import { clientInputSchema, documentInputSchema, companyInputSchema, clientFicheUploadSchema, serviceInputSchema } from "@/lib/auth-schemas";
import {
  CLIENT_FICHES_BUCKET,
  createStorageAdmin,
  publicObjectUrl,
  sanitizeFileName,
} from "@/lib/client-fiches-storage";
import { COMPANY_DEFAULTS } from "@/lib/company-defaults";
import { getCurrentSession, type AppSession } from "@/lib/session.functions";
import {
  broadcastDocumentStatusChange,
  staffDisplayName,
} from "@/lib/notify-document-status";
import {
  archiveScope,
  canDeleteClient,
  canEditCompanySettings,
  canWriteDocument,
  canWriteService,
  isSuperAdmin,
} from "@/lib/roles";
import {
  advanceSubscriptionDate,
  clampSubscriptionDay,
  nextSubscriptionDate,
} from "@/lib/subscription";
import {
  buildNextCommercialNumber,
  isCommercialDocType,
  type CommercialDocType,
} from "@/lib/document-number";
import { sendDocumentEmail } from "@/lib/send-document-email";

const docInclude = {
  lines: { orderBy: { position: "asc" as const } },
  sections: { orderBy: { position: "asc" as const } },
  createdBy: true,
  client: true,
};

async function allocateCommercialNumber(
  cabinet: Cabinet,
  type: CommercialDocType,
  issueDate: string | Date,
): Promise<string> {
  const rows = await prisma.document.findMany({
    where: { cabinet, type },
    select: { number: true },
  });
  return buildNextCommercialNumber({
    cabinet,
    type,
    issueDate,
    existingNumbers: rows.map((r) => r.number),
  });
}

const cabinetScopeSchema = z.enum(["conseil", "expertise_fiscale"]).optional();

async function requireSession(): Promise<NonNullable<AppSession>> {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  return session;
}

/**
 * Filtre cabinet pour listes.
 * Toujours un cabinet concret (actif, ou scope explicite) — jamais « tous ».
 */
function resolveDocCabinetFilter(
  session: NonNullable<AppSession>,
  scope?: "all" | Cabinet,
): Cabinet {
  if (scope === "conseil" || scope === "expertise_fiscale") return scope;
  return session.activeCabinet;
}

function cabinetDocWhere(
  cabinet: Cabinet,
  type?: DocumentType,
  extra?: { createdById?: string },
) {
  return {
    cabinet,
    ...(type ? { type } : {}),
    ...(extra?.createdById ? { createdById: extra.createdById } : {}),
  };
}

async function assertClientInCabinet(clientId: string, cabinet: Cabinet) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, cabinet },
  });
  if (!client) throw new Error("Client introuvable dans ce cabinet");
  return client;
}

// ─── Clients ───────────────────────────────────────────────────────────────

export const listClients = createServerFn({ method: "GET" })
  .validator(z.object({ cabinetScope: cabinetScopeSchema }).optional())
  .handler(async ({ data }) => {
    const session = await requireSession();
    const cabinet = resolveDocCabinetFilter(session, data?.cabinetScope);
    const rows = await prisma.client.findMany({
      where: { cabinet, isTransient: false },
      orderBy: { name: "asc" },
    });
    return rows.map(mapClient);
  });

export const getClient = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const row = await prisma.client.findFirst({
      where: isSuperAdmin(session.staff.role)
        ? { id: data.id }
        : { id: data.id, cabinet: session.activeCabinet },
    });
    return row ? mapClient(row) : null;
  });

export const createClient = createServerFn({ method: "POST" })
  .validator(clientInputSchema)
  .handler(async ({ data }) => {
    const { staff, activeCabinet } = await requireSession();
    const row = await prisma.client.create({
      data: {
        name: data.name,
        sigle: data.sigle ?? "",
        legalForm: data.legalForm,
        shareCapital: data.shareCapital ?? "",
        nif: data.nif,
        niu: data.niu,
        rccm: data.rccm,
        cnss: data.cnss ?? "",
        cnamgs: data.cnamgs ?? "",
        activity: data.activity ?? "",
        activityDetail: data.activityDetail ?? "",
        contactName: data.contactName,
        representativeTitle: data.representativeTitle ?? "",
        email: data.email,
        phone: data.phone,
        address: data.address,
        bp: data.bp ?? "",
        city: data.city,
        country: data.country,
        anpiNumber: data.anpiNumber ?? "",
        anpiDate: data.anpiDate ?? "",
        ficheCircuitUrl: data.ficheCircuitUrl ?? null,
        ficheCircuitName: data.ficheCircuitName ?? null,
        ficheStatusUrl: data.ficheStatusUrl ?? null,
        ficheStatusName: data.ficheStatusName ?? null,
        cabinet: activeCabinet,
        createdById: staff.id,
      },
    });
    return mapClient(row);
  });

export const updateClient = createServerFn({ method: "POST" })
  .validator(clientInputSchema.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    const { activeCabinet } = await requireSession();
    const { id, ...rest } = data;
    const existing = await prisma.client.findFirst({
      where: { id, cabinet: activeCabinet },
    });
    if (!existing) throw new Error("Client introuvable");
    const row = await prisma.client.update({
      where: { id },
      data: {
        name: rest.name,
        sigle: rest.sigle ?? "",
        legalForm: rest.legalForm,
        shareCapital: rest.shareCapital ?? "",
        nif: rest.nif,
        niu: rest.niu,
        rccm: rest.rccm,
        cnss: rest.cnss ?? "",
        cnamgs: rest.cnamgs ?? "",
        activity: rest.activity ?? "",
        activityDetail: rest.activityDetail ?? "",
        contactName: rest.contactName,
        representativeTitle: rest.representativeTitle ?? "",
        email: rest.email,
        phone: rest.phone,
        address: rest.address,
        bp: rest.bp ?? "",
        city: rest.city,
        country: rest.country,
        anpiNumber: rest.anpiNumber ?? "",
        anpiDate: rest.anpiDate ?? "",
        ...(rest.ficheCircuitUrl !== undefined
          ? { ficheCircuitUrl: rest.ficheCircuitUrl, ficheCircuitName: rest.ficheCircuitName ?? null }
          : {}),
        ...(rest.ficheStatusUrl !== undefined
          ? { ficheStatusUrl: rest.ficheStatusUrl, ficheStatusName: rest.ficheStatusName ?? null }
          : {}),
      },
    });
    return mapClient(row);
  });

/** Téléverse une fiche circuit ou status pour un client (Supabase Storage). */
export const uploadClientFiche = createServerFn({ method: "POST" })
  .validator(clientFicheUploadSchema)
  .handler(async ({ data }) => {
    const session = await requireSession();
    const existing = await prisma.client.findFirst({
      where: isSuperAdmin(session.staff.role)
        ? { id: data.clientId }
        : { id: data.clientId, cabinet: session.activeCabinet },
    });
    if (!existing) throw new Error("Client introuvable");

    const raw = Buffer.from(data.base64, "base64");
    const maxBytes = 8 * 1024 * 1024;
    if (raw.byteLength > maxBytes) {
      throw new Error("Fichier trop volumineux (max 8 Mo)");
    }

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(data.contentType)) {
      throw new Error("Type de fichier non supporté (PDF, Word ou image)");
    }

    const ext =
      data.fileName.includes(".")
        ? data.fileName.split(".").pop()!.toLowerCase()
        : data.contentType === "application/pdf"
          ? "pdf"
          : "bin";
    const safeName = sanitizeFileName(data.fileName);
    const path = `${existing.cabinet}/${existing.id}/${data.kind}-${Date.now()}-${safeName || `fichier.${ext}`}`;

    const supabase = createStorageAdmin();
    const { error: upErr } = await supabase.storage
      .from(CLIENT_FICHES_BUCKET)
      .upload(path, raw, {
        contentType: data.contentType,
        upsert: true,
      });

    if (upErr) {
      throw new Error(
        `Upload impossible : ${upErr.message}. Vérifiez que le bucket « ${CLIENT_FICHES_BUCKET} » existe et est public.`,
      );
    }

    const url = publicObjectUrl(CLIENT_FICHES_BUCKET, path);
    const patch =
      data.kind === "circuit"
        ? { ficheCircuitUrl: url, ficheCircuitName: data.fileName }
        : { ficheStatusUrl: url, ficheStatusName: data.fileName };

    const row = await prisma.client.update({
      where: { id: existing.id },
      data: patch,
    });
    return mapClient(row);
  });

export const deleteClient = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff } = session;
    const existing = await prisma.client.findFirst({
      where: isSuperAdmin(staff.role)
        ? { id: data.id }
        : { id: data.id, cabinet: session.activeCabinet },
    });
    if (!existing) throw new Error("Client introuvable");
    if (!canDeleteClient(staff.role, staff.id, existing.createdById)) {
      throw new Error("Suppression réservée au créateur, à un admin ou au super admin");
    }

    const docCount = await prisma.document.count({
      where: { clientId: data.id },
    });
    if (docCount > 0) {
      throw new Error(
        `Impossible de supprimer « ${existing.name} » : ${docCount} document${docCount > 1 ? "s" : ""} y ${docCount > 1 ? "sont" : "est"} encore rattaché${docCount > 1 ? "s" : ""}. Archivez ou supprimez d’abord les factures, devis, etc.`,
      );
    }

    await prisma.client.delete({ where: { id: data.id } });
    return { ok: true };
  });

// ─── Services ──────────────────────────────────────────────────────────────

export const listServices = createServerFn({ method: "GET" }).handler(async () => {
  const { activeCabinet } = await requireSession();
  const rows = await prisma.service.findMany({
    where: { cabinet: activeCabinet },
    orderBy: { name: "asc" },
  });
  return rows.map(mapService);
});

export const upsertService = createServerFn({ method: "POST" })
  .validator(serviceInputSchema)
  .handler(async ({ data }) => {
    const { staff, activeCabinet } = await requireSession();

    if (data.id) {
      const existing = await prisma.service.findFirst({
        where: { id: data.id, cabinet: activeCabinet },
      });
      if (!existing) throw new Error("Service introuvable");
      if (!canWriteService(staff.role, staff.id, existing.createdById)) {
        throw new Error("Accès refusé — service en lecture seule");
      }

      const dup = await prisma.service.findFirst({
        where: { cabinet: activeCabinet, code: data.code, id: { not: data.id } },
      });
      if (dup) throw new Error(`Le code « ${data.code} » est déjà utilisé`);

      const row = await prisma.service.update({
        where: { id: data.id },
        data: {
          code: data.code,
          name: data.name,
          description: data.description,
          unit: data.unit,
          unitPrice: data.unitPrice,
          vatRate: data.vatRate,
          category: data.category,
        },
      });
      return mapService(row);
    }

    const dup = await prisma.service.findFirst({
      where: { cabinet: activeCabinet, code: data.code },
    });
    if (dup) throw new Error(`Le code « ${data.code} » est déjà utilisé`);

    const row = await prisma.service.create({
      data: {
        cabinet: activeCabinet,
        code: data.code,
        name: data.name,
        description: data.description,
        unit: data.unit,
        unitPrice: data.unitPrice,
        vatRate: data.vatRate,
        category: data.category,
        createdById: staff.id,
      },
    });
    return mapService(row);
  });

export const deleteService = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { staff, activeCabinet } = await requireSession();
    const existing = await prisma.service.findFirst({
      where: { id: data.id, cabinet: activeCabinet },
    });
    if (!existing) throw new Error("Service introuvable");
    if (!canWriteService(staff.role, staff.id, existing.createdById)) {
      throw new Error(
        "Suppression réservée au créateur, à un admin ou au super admin",
      );
    }

    const lineCount = await prisma.documentLine.count({
      where: { serviceId: data.id },
    });
    if (lineCount > 0) {
      throw new Error(
        `Ce service est utilisé dans ${lineCount} ligne(s) de documents. Supprimez d'abord ces références.`,
      );
    }

    await prisma.service.delete({ where: { id: data.id } });
    return { ok: true };
  });

// ─── Documents ───────────────────────────────────────────────────────────

export const listDocuments = createServerFn({ method: "GET" })
  .validator(
    z.object({
      type: z.enum(["quotation", "invoice", "letter"]).optional(),
      cabinetScope: cabinetScopeSchema,
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const cabinet = resolveDocCabinetFilter(session, data.cabinetScope);
    const rows = await prisma.document.findMany({
      where: cabinetDocWhere(cabinet, data.type),
      include: docInclude,
      orderBy: { issueDate: "desc" },
    });
    return rows.map(mapDocument);
  });

/** Tous les documents (cabinet actif, ou tous si super admin + scope). */
export const listAllDocuments = createServerFn({ method: "GET" })
  .validator(
    z.object({
      type: z.enum(["quotation", "invoice", "letter"]).optional(),
      cabinetScope: cabinetScopeSchema,
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const cabinet = resolveDocCabinetFilter(session, data.cabinetScope);
    const rows = await prisma.document.findMany({
      where: cabinetDocWhere(cabinet, data.type),
      include: docInclude,
      orderBy: { issueDate: "desc" },
    });
    return rows.map(mapDocument);
  });

export const getDocument = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const row = await prisma.document.findFirst({
      where: isSuperAdmin(session.staff.role)
        ? { id: data.id }
        : { id: data.id, cabinet: session.activeCabinet },
      include: docInclude,
    });
    if (!row) return null;
    return mapDocument(row);
  });

/** Aperçu du prochain numéro chronologique (facture / devis). */
export const peekNextDocumentNumber = createServerFn({ method: "GET" })
  .validator(
    z.object({
      type: z.enum(["invoice", "quotation"]),
      issueDate: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const { activeCabinet } = await requireSession();
    const number = await allocateCommercialNumber(
      activeCabinet,
      data.type,
      data.issueDate,
    );
    return { number };
  });

export const upsertDocument = createServerFn({ method: "POST" })
  .validator(documentInputSchema)
  .handler(async ({ data }) => {
    try {
      return await upsertDocumentHandler(data);
    } catch (err) {
      throw new Error(formatPrismaError(err, "Création / enregistrement du document impossible"));
    }
  });

async function upsertDocumentHandler(
  data: z.infer<typeof documentInputSchema>,
) {
    const session = await requireSession();
    const { staff, activeCabinet } = session;
    await assertClientInCabinet(data.clientId, activeCabinet);

    const commercial = data.type === "invoice" || data.type === "quotation";

    const buildLineRows = (sectionIdMap: Map<string, string>) =>
      data.items.map((item, position) => ({
        serviceId:
          item.serviceId && item.serviceId.trim() ? item.serviceId.trim() : null,
        description: item.description,
        quantity: Number.isFinite(item.quantity) ? item.quantity : 0,
        unitPrice: Number.isFinite(item.unitPrice) ? item.unitPrice : 0,
        vatRate: Number.isFinite(item.vatRate) ? item.vatRate : 0,
        discount: commercial
          ? 0
          : Number.isFinite(item.discount)
            ? item.discount
            : 0,
        tpsRate: Number.isFinite(item.tpsRate) ? Math.max(0, item.tpsRate) : 0,
        cssRate: Number.isFinite(item.cssRate) ? item.cssRate ?? 0 : 0,
        position,
        sectionId:
          commercial && item.sectionId
            ? (sectionIdMap.get(item.sectionId) ?? null)
            : null,
      }));

    /** Recrée sections + lignes (ordre : sections d’abord pour les FK). */
    const replaceSectionsAndLines = async (
      documentId: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db: any = prisma,
    ) => {
      await db.documentLine.deleteMany({ where: { documentId } });
      await db.documentSection.deleteMany({ where: { documentId } });

      const sectionIdMap = new Map<string, string>();
      const sectionsIn = commercial ? (data.sections ?? []) : [];
      for (let i = 0; i < sectionsIn.length; i++) {
        const s = sectionsIn[i];
        const created = await db.documentSection.create({
          data: {
            documentId,
            title: s.title.trim() || `Tâche ${i + 1}`,
            position: typeof s.position === "number" ? s.position : i,
          },
        });
        sectionIdMap.set(s.id, created.id);
      }

      const lineRows = buildLineRows(sectionIdMap);
      if (lineRows.length > 0) {
        await db.documentLine.createMany({
          data: lineRows.map((l) => ({ ...l, documentId })),
        });
      }
    };

    let number = data.number;
    if (!data.id && isCommercialDocType(data.type)) {
      number = await allocateCommercialNumber(
        activeCabinet,
        data.type,
        data.issueDate,
      );
    }

    const docDiscount = commercial
      ? Math.min(100, Math.max(0, Number(data.discount) || 0))
      : 0;

    const subtotal = Number.isFinite(data.subtotal) ? data.subtotal : 0;
    const tps = Math.max(0, data.tps ?? 0);
    const css = data.css ?? 0;
    const vat =
      tps > 0
        ? 0
        : Number.isFinite(data.vat)
          ? data.vat
          : 0;

    const docData = {
      cabinet: activeCabinet,
      type: data.type,
      number,
      clientId: data.clientId,
      createdById: staff.id,
      status: data.status,
      issueDate: new Date(data.issueDate),
      dueDate:
        data.dueDate && String(data.dueDate).trim()
          ? new Date(data.dueDate)
          : null,
      subtotal,
      discount: docDiscount,
      tps,
      css,
      vat,
      total: commercial
        ? Math.max(0, subtotal - tps + css + vat)
        : data.total,
      currency: data.currency,
      notes: data.notes ?? null,
      paymentTerms: data.paymentTerms ?? null,
      validityDays: data.validityDays ?? null,
      executionTerms: data.executionTerms ?? null,
      subject: data.subject ?? null,
      salutation: data.salutation ?? null,
      body: data.body ?? null,
      closing: data.closing ?? null,
      signatoryTitle: data.signatoryTitle ?? null,
      recipientOverride: data.recipientOverride ?? null,
    };

    if (data.id) {
      const existing = await prisma.document.findFirst({
        where: { id: data.id, cabinet: activeCabinet },
      });
      if (!existing) throw new Error("Document introuvable");
      if (!canWriteDocument(staff.role, staff.id, existing.createdById)) {
        throw new Error("Accès refusé — document en lecture seule");
      }

      let updated;
      try {
        updated = await prisma.$transaction(async (tx) => {
          await tx.document.update({
            where: { id: data.id },
            data: {
              ...docData,
              createdById: existing.createdById,
            },
          });
          await replaceSectionsAndLines(data.id!, tx);
          return tx.document.findFirstOrThrow({
            where: { id: data.id },
            include: docInclude,
          });
        });
      } catch (err) {
        if (!isPrismaColumnMissing(err, "discount")) throw err;
        const { discount: _d, ...withoutDiscount } = docData;
        updated = await prisma.$transaction(async (tx) => {
          await tx.document.update({
            where: { id: data.id },
            data: {
              ...withoutDiscount,
              createdById: existing.createdById,
            },
          });
          await replaceSectionsAndLines(data.id!, tx);
          return tx.document.findFirstOrThrow({
            where: { id: data.id },
            include: docInclude,
          });
        });
      }
      if (
        (existing.type === "letter" ||
          existing.type === "invoice" ||
          existing.type === "quotation") &&
        existing.status === "draft"
      ) {
        const { cancelPendingLetterSignatures } = await import(
          "@/lib/letter-signature.functions"
        );
        await cancelPendingLetterSignatures(existing.id);
      }
      if (existing.status !== data.status) {
        await broadcastDocumentStatusChange({
          actorStaffId: staff.id,
          actorName: staffDisplayName(staff),
          documentId: updated.id,
          documentNumber: updated.number,
          documentType: updated.type,
          previousStatus: existing.status,
          nextStatus: data.status,
        });
      }
      return mapDocument(updated);
    }

    let created;
    try {
      created = await prisma.$transaction(async (tx) => {
        const row = await tx.document.create({
          data: { ...docData },
        });
        await replaceSectionsAndLines(row.id, tx);
        return tx.document.findFirstOrThrow({
          where: { id: row.id },
          include: docInclude,
        });
      });
    } catch (err) {
      if (!isPrismaColumnMissing(err, "discount")) throw err;
      const { discount: _d, ...withoutDiscount } = docData;
      created = await prisma.$transaction(async (tx) => {
        const row = await tx.document.create({
          data: { ...withoutDiscount },
        });
        await replaceSectionsAndLines(row.id, tx);
        return tx.document.findFirstOrThrow({
          where: { id: row.id },
          include: docInclude,
        });
      });
    }
    if (data.status !== "draft") {
      await broadcastDocumentStatusChange({
        actorStaffId: staff.id,
        actorName: staffDisplayName(staff),
        documentId: created.id,
        documentNumber: created.number,
        documentType: created.type,
        previousStatus: "draft",
        nextStatus: data.status,
      });
    }
    return mapDocument(created);
}

export const setDocumentStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      status: z.enum([
        "draft",
        "signed",
        "sent",
        "accepted",
        "rejected",
        "paid",
        "overdue",
        "archived",
        "cancelled",
      ]),
      paymentMethod: z.enum(["cash", "check", "bank_transfer"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff } = session;
    const existing = await prisma.document.findFirst({
      where: isSuperAdmin(staff.role)
        ? { id: data.id }
        : { id: data.id, cabinet: session.activeCabinet },
    });
    if (!existing) throw new Error("Document introuvable");
    if (!canWriteDocument(staff.role, staff.id, existing.createdById)) {
      throw new Error("Accès refusé — document en lecture seule");
    }
    if (
      (existing.type === "letter" ||
        existing.type === "invoice" ||
        existing.type === "quotation") &&
      data.status === "signed"
    ) {
      throw new Error(
        "Pour signer, ouvrez le document et utilisez le bouton Signer (après aperçu).",
      );
    }
    if (data.status === "paid" && !data.paymentMethod) {
      throw new Error(
        "Indiquez le moyen de paiement (espèces, chèque ou virement)",
      );
    }
    const updated = await prisma.document.update({
      where: { id: data.id },
      data: {
        status: data.status,
        ...(data.status === "paid" && data.paymentMethod
          ? { paymentMethod: data.paymentMethod }
          : {}),
      },
      include: docInclude,
    });
    let emailNotice: {
      emailSent?: boolean;
      emailError?: string;
      emailRecipients?: number;
    } = {};
    if (existing.status !== data.status) {
      emailNotice = await broadcastDocumentStatusChange({
        actorStaffId: staff.id,
        actorName: staffDisplayName(staff),
        documentId: updated.id,
        documentNumber: updated.number,
        documentType: updated.type,
        previousStatus: existing.status,
        nextStatus: data.status,
        paymentMethod: updated.paymentMethod ?? undefined,
      });
    }
    return { ...mapDocument(updated), ...emailNotice };
  });

export const setInvoiceSubscription = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      enabled: z.boolean(),
      dayOfMonth: z.number().int().min(1).max(28).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff } = session;
    const existing = await prisma.document.findFirst({
      where: isSuperAdmin(staff.role)
        ? { id: data.id, type: "invoice" }
        : { id: data.id, type: "invoice", cabinet: session.activeCabinet },
    });
    if (!existing) throw new Error("Facture introuvable");
    if (!canWriteDocument(staff.role, staff.id, existing.createdById)) {
      throw new Error("Accès refusé — document en lecture seule");
    }

    if (!data.enabled) {
      const row = await prisma.document.update({
        where: { id: existing.id },
        data: {
          isSubscription: true,
          subscriptionActive: false,
        },
        include: docInclude,
      });
      return mapDocument(row);
    }

    const day = clampSubscriptionDay(data.dayOfMonth ?? existing.subscriptionDay ?? 1);
    const nextAt = nextSubscriptionDate(day);
    const row = await prisma.document.update({
      where: { id: existing.id },
      data: {
        isSubscription: true,
        subscriptionActive: true,
        subscriptionDay: day,
        subscriptionNextAt: nextAt,
      },
      include: docInclude,
    });
    return mapDocument(row);
  });

/** Génère et envoie les factures d'abonnement arrivées à échéance. */
export const processDueSubscriptions = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await requireSession();
    const today = new Date();
    const todayUtc = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );

    const due = await prisma.document.findMany({
      where: {
        type: "invoice",
        isSubscription: true,
        subscriptionActive: true,
        subscriptionNextAt: { lte: todayUtc },
        ...(isSuperAdmin(session.staff.role)
          ? {}
          : { cabinet: session.activeCabinet }),
      },
      include: {
        lines: { orderBy: { position: "asc" } },
        sections: { orderBy: { position: "asc" } },
      },
    });

    const generated: string[] = [];
    const errors: string[] = [];

    for (const template of due) {
      try {
        if (!canWriteDocument(session.staff.role, session.staff.id, template.createdById)) {
          continue;
        }
        const issueDate = todayUtc;
        const number = await allocateCommercialNumber(
          template.cabinet,
          "invoice",
          issueDate,
        );
        const dueDate = new Date(todayUtc);
        dueDate.setUTCDate(dueDate.getUTCDate() + 30);

        const subtotal = Number(template.subtotal);
        const tps = Number(template.tps);
        const css = Number(template.css);
        const vat = Number(template.vat);
        const total = Math.max(0, subtotal - tps + css + vat);

        const created = await prisma.$transaction(async (tx) => {
          const doc = await tx.document.create({
            data: {
              cabinet: template.cabinet,
              type: "invoice",
              number,
              clientId: template.clientId,
              createdById: session.staff.id,
              status: "draft",
              issueDate,
              dueDate,
              subtotal,
              discount: Number(template.discount ?? 0),
              tps,
              css,
              vat,
              total,
              currency: template.currency,
              notes: template.notes,
              paymentTerms: template.paymentTerms,
              subscriptionOfId: template.id,
            },
          });

          const sectionIdMap = new Map<string, string>();
          for (const s of template.sections) {
            const sec = await tx.documentSection.create({
              data: {
                documentId: doc.id,
                title: s.title,
                position: s.position,
              },
            });
            sectionIdMap.set(s.id, sec.id);
          }

          if (template.lines.length > 0) {
            await tx.documentLine.createMany({
              data: template.lines.map((l, position) => ({
                documentId: doc.id,
                serviceId: l.serviceId,
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                vatRate: l.vatRate,
                discount: l.discount,
                tpsRate: l.tpsRate,
                cssRate: l.cssRate,
                position,
                sectionId: l.sectionId
                  ? (sectionIdMap.get(l.sectionId) ?? null)
                  : null,
              })),
            });
          }

          return doc;
        });

        const day = clampSubscriptionDay(template.subscriptionDay ?? 1);
        const nextAt = advanceSubscriptionDate(
          template.subscriptionNextAt ?? todayUtc,
          day,
        );
        // Si encore dans le passé (retard cumulé), avancer jusqu'à ≥ aujourd'hui
        let safeNext = nextAt;
        while (safeNext.getTime() <= todayUtc.getTime()) {
          safeNext = advanceSubscriptionDate(safeNext, day);
        }
        await prisma.document.update({
          where: { id: template.id },
          data: { subscriptionNextAt: safeNext },
        });

        try {
          await sendDocumentEmail({ data: { id: created.id } });
        } catch (emailErr) {
          errors.push(
            `${number}: créée mais e-mail non envoyé — ${
              emailErr instanceof Error ? emailErr.message : "erreur"
            }`,
          );
        }
        generated.push(number);
      } catch (err) {
        errors.push(
          `${template.number}: ${err instanceof Error ? err.message : "échec"}`,
        );
      }
    }

    return { generated, errors, count: generated.length };
  },
);

// ─── Notifications ───────────────────────────────────────────────────────

const notificationInclude = {
  document: { select: { type: true } },
} as const;

export const listNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const { staff, activeCabinet } = await requireSession();
  const rows = await prisma.notification.findMany({
    where: {
      staffId: staff.id,
      OR: [
        { cabinet: activeCabinet },
        // Anciennes notifs sans cabinet : rattachement via le document
        { cabinet: null, document: { cabinet: activeCabinet } },
      ],
    },
    include: notificationInclude,
    orderBy: { at: "desc" },
    take: 100,
  });
  return rows.map(mapNotification);
});

export const markAllNotificationsRead = createServerFn({ method: "POST" }).handler(
  async () => {
    const { staff, activeCabinet } = await requireSession();
    await prisma.notification.updateMany({
      where: {
        staffId: staff.id,
        read: false,
        OR: [
          { cabinet: activeCabinet },
          { cabinet: null, document: { cabinet: activeCabinet } },
        ],
      },
      data: { read: true },
    });
    return { ok: true };
  },
);

export const markNotificationRead = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { staff } = await requireSession();
    const row = await prisma.notification.findUnique({ where: { id: data.id } });
    if (!row || row.staffId !== staff.id) throw new Error("Notification introuvable");
    await prisma.notification.update({
      where: { id: data.id },
      data: { read: true },
    });
    return { ok: true };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff } = session;
    const existing = await prisma.document.findFirst({
      where: isSuperAdmin(staff.role)
        ? { id: data.id }
        : { id: data.id, cabinet: session.activeCabinet },
    });
    if (!existing) throw new Error("Document introuvable");
    if (!canWriteDocument(staff.role, staff.id, existing.createdById)) {
      throw new Error(
        "Suppression réservée au créateur, à un admin ou au super admin",
      );
    }
    await prisma.document.delete({ where: { id: data.id } });
    return { ok: true };
  });

// ─── Company ───────────────────────────────────────────────────────────────

export const getCompany = createServerFn({ method: "GET" }).handler(async () => {
  const { activeCabinet } = await requireSession();
  const row = await prisma.company.findUnique({
    where: { cabinet: activeCabinet },
  });
  return row
    ? mapCompany(row, activeCabinet)
    : COMPANY_DEFAULTS[activeCabinet];
});

/** Société d'un cabinet précis (preview / PDF d'un document). */
export const getCompanyForCabinet = createServerFn({ method: "GET" })
  .validator(z.object({ cabinet: z.enum(["conseil", "expertise_fiscale"]) }))
  .handler(async ({ data }) => {
    await requireSession();
    const row = await prisma.company.findUnique({
      where: { cabinet: data.cabinet },
    });
    return row
      ? mapCompany(row, data.cabinet)
      : COMPANY_DEFAULTS[data.cabinet];
  });

export const updateCompany = createServerFn({ method: "POST" })
  .validator(companyInputSchema)
  .handler(async ({ data }) => {
    const session = await requireSession();
    if (!canEditCompanySettings(session.staff.role)) {
      throw new Error("Modification réservée aux administrateurs");
    }
    const { activeCabinet } = session;
    const payload = {
      name: data.name,
      tagline: data.tagline ?? null,
      nif: data.nif,
      niu: data.niu,
      rccm: data.rccm,
      cnss: data.cnss ?? null,
      address: data.address,
      city: data.city,
      phone: data.phone,
      email: data.email,
      website: data.website ?? null,
      bankName: data.bankName ?? null,
      bankAccount: data.bankAccount ?? null,
      mailFromEmail: data.mailFromEmail?.trim() || null,
      mailReplyTo: data.mailReplyTo?.trim() || null,
      managerName: data.managerName?.trim() || null,
      stampUrl: data.stampUrl?.trim() || null,
    };
    const row = await prisma.company.upsert({
      where: { cabinet: activeCabinet },
      create: { ...payload, cabinet: activeCabinet },
      update: payload,
    });
    return mapCompany(row, activeCabinet);
  });

/** Enregistre une signature manuscrite (PNG/JPEG/WebP) pour le cabinet actif. */
export const uploadCompanySignature = createServerFn({ method: "POST" })
  .validator(
    z.object({
      base64: z.string().min(1),
      contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
      fileName: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    if (!canEditCompanySettings(session.staff.role)) {
      throw new Error("Modification réservée aux administrateurs");
    }
    const { activeCabinet } = session;

    const raw = Buffer.from(data.base64, "base64");
    if (raw.byteLength > 2 * 1024 * 1024) {
      throw new Error("Signature trop volumineuse (max 2 Mo)");
    }

    const { uploadCompanySignatureBytes } = await import(
      "@/lib/company-signature-storage"
    );
    const uploaded = await uploadCompanySignatureBytes({
      cabinet: activeCabinet,
      bytes: raw,
      contentType: data.contentType,
      fileName: data.fileName,
    });

    const existing = await prisma.company.findUnique({
      where: { cabinet: activeCabinet },
    });
    const defaults = COMPANY_DEFAULTS[activeCabinet];
    const row = await prisma.company.upsert({
      where: { cabinet: activeCabinet },
      create: {
        cabinet: activeCabinet,
        name: existing?.name ?? defaults.name,
        tagline: existing?.tagline ?? defaults.tagline,
        nif: existing?.nif ?? defaults.nif,
        niu: existing?.niu ?? defaults.niu,
        rccm: existing?.rccm ?? defaults.rccm,
        cnss: existing?.cnss ?? defaults.cnss,
        address: existing?.address ?? defaults.address,
        city: existing?.city ?? defaults.city,
        phone: existing?.phone ?? defaults.phone,
        email: existing?.email ?? defaults.email,
        website: existing?.website ?? defaults.website,
        bankName: existing?.bankName ?? defaults.bankName,
        bankAccount: existing?.bankAccount ?? defaults.bankAccount,
        mailFromEmail: existing?.mailFromEmail ?? defaults.mailFromEmail,
        mailReplyTo: existing?.mailReplyTo ?? defaults.mailReplyTo,
        managerName: existing?.managerName ?? defaults.managerName,
        stampUrl: uploaded.fileUrl,
      },
      update: { stampUrl: uploaded.fileUrl },
    });

    return mapCompany(row, activeCabinet);
  });

/** Filtre archives côté API selon le rôle. */
export const listArchivedDocuments = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await requireSession();
    const { staff, activeCabinet } = session;
    const scope = archiveScope(staff.role);
    const rows = await prisma.document.findMany({
      where: {
        cabinet: activeCabinet,
        ...(scope === "own" ? { createdById: staff.id } : {}),
        OR: [
          { type: "invoice", status: { in: ["paid", "archived"] } },
          { type: "quotation", status: { in: ["accepted", "rejected"] } },
        ],
      },
      include: docInclude,
      orderBy: { issueDate: "desc" },
    });
    return rows.map(mapDocument);
  },
);

// ─── PDF traces ────────────────────────────────────────────────────────────

export const recordDocumentPdf = createServerFn({ method: "POST" })
  .validator(
    z.object({
      documentId: z.string().min(1),
      action: z.enum(["download", "email"]),
      fileName: z.string().min(1),
      base64: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff } = session;
    const doc = await prisma.document.findFirst({
      where: isSuperAdmin(staff.role)
        ? { id: data.documentId }
        : { id: data.documentId, cabinet: session.activeCabinet },
    });
    if (!doc) throw new Error("Document introuvable");
    if (!canWriteDocument(staff.role, staff.id, doc.createdById)) {
      throw new Error("Accès refusé");
    }

    const raw = Buffer.from(data.base64, "base64");
    if (raw.byteLength > 12 * 1024 * 1024) {
      throw new Error("PDF trop volumineux (max 12 Mo)");
    }

    const { uploadDocumentPdfBytes } = await import("@/lib/document-pdf-storage");
    const uploaded = await uploadDocumentPdfBytes({
      cabinet: doc.cabinet,
      documentId: doc.id,
      action: data.action,
      fileName: data.fileName,
      bytes: raw,
    });

    const trace = await prisma.documentPdfTrace.create({
      data: {
        documentId: doc.id,
        cabinet: doc.cabinet,
        action: data.action,
        fileName: data.fileName,
        fileUrl: uploaded.fileUrl,
        staffId: staff.id,
      },
    });

    return {
      id: trace.id,
      fileUrl: trace.fileUrl,
      fileName: trace.fileName,
      action: trace.action,
      createdAt: trace.createdAt.toISOString(),
    };
  });

export const listDocumentPdfTraces = createServerFn({ method: "GET" })
  .validator(z.object({ documentId: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const doc = await prisma.document.findFirst({
      where: isSuperAdmin(session.staff.role)
        ? { id: data.documentId }
        : { id: data.documentId, cabinet: session.activeCabinet },
      select: { id: true },
    });
    if (!doc) throw new Error("Document introuvable");

    const rows = await prisma.documentPdfTrace.findMany({
      where: { documentId: data.documentId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        staff: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      action: r.action as "download" | "email",
      fileName: r.fileName,
      fileUrl: r.fileUrl,
      createdAt: r.createdAt.toISOString(),
      staffName: `${r.staff.firstName} ${r.staff.lastName}`.trim() || r.staff.email,
    }));
  });
