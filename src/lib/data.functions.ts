import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Cabinet, DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapClient, mapDocument, mapService, mapCompany, mapNotification } from "@/lib/mappers";
import { clientInputSchema, documentInputSchema, companyInputSchema } from "@/lib/auth-schemas";
import { COMPANY_DEFAULTS } from "@/lib/company-defaults";
import { getCurrentSession, type AppSession } from "@/lib/session.functions";
import {
  broadcastDocumentStatusChange,
  staffDisplayName,
} from "@/lib/notify-document-status";
import {
  archiveScope,
  canDeleteClients,
  canEditCompanySettings,
  canWriteDocument,
  isSuperAdmin,
} from "@/lib/roles";

const docInclude = {
  lines: { orderBy: { position: "asc" as const } },
  createdBy: true,
  client: true,
};

const cabinetScopeSchema = z.enum(["all", "conseil", "expertise_fiscale"]).optional();

async function requireSession(): Promise<NonNullable<AppSession>> {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  return session;
}

function resolveDocCabinetFilter(
  session: NonNullable<AppSession>,
  scope?: "all" | Cabinet,
): Cabinet | undefined {
  if (isSuperAdmin(session.staff.role)) {
    if (!scope || scope === "all") return undefined;
    return scope;
  }
  return session.activeCabinet;
}

function cabinetDocWhere(
  cabinet: Cabinet | undefined,
  type?: DocumentType,
  extra?: { createdById?: string },
) {
  return {
    ...(cabinet ? { cabinet } : {}),
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
      where: cabinet ? { cabinet } : isSuperAdmin(session.staff.role) ? {} : { cabinet: session.activeCabinet },
      orderBy: { name: "asc" },
    });
    return rows.map(mapClient);
  });

export const getClient = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { activeCabinet } = await requireSession();
    const row = await prisma.client.findFirst({
      where: { id: data.id, cabinet: activeCabinet },
    });
    return row ? mapClient(row) : null;
  });

export const createClient = createServerFn({ method: "POST" })
  .validator(clientInputSchema)
  .handler(async ({ data }) => {
    const { activeCabinet } = await requireSession();
    const row = await prisma.client.create({
      data: { ...data, cabinet: activeCabinet },
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
    const row = await prisma.client.update({ where: { id }, data: rest });
    return mapClient(row);
  });

export const deleteClient = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession();
    if (!canDeleteClients(session.staff.role)) {
      throw new Error("Suppression réservée aux administrateurs");
    }
    const existing = await prisma.client.findFirst({
      where: { id: data.id, cabinet: session.activeCabinet },
    });
    if (!existing) throw new Error("Client introuvable");
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

// ─── Documents ───────────────────────────────────────────────────────────

export const listDocuments = createServerFn({ method: "GET" })
  .validator(
    z.object({
      type: z.enum(["quotation", "invoice", "proforma", "letter"]).optional(),
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
      type: z.enum(["quotation", "invoice", "proforma", "letter"]).optional(),
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

export const upsertDocument = createServerFn({ method: "POST" })
  .validator(documentInputSchema)
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff, activeCabinet } = session;
    await assertClientInCabinet(data.clientId, activeCabinet);

    const lines = data.items.map((item, position) => ({
      id: item.id,
      serviceId: item.serviceId ?? null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      discount: item.discount ?? 0,
      tpsRate: item.tpsRate ?? 0,
      cssRate: item.cssRate ?? 0,
      position,
    }));

    const docData = {
      cabinet: activeCabinet,
      type: data.type,
      number: data.number,
      clientId: data.clientId,
      createdById: staff.id,
      status: data.status,
      issueDate: new Date(data.issueDate),
      dueDate: new Date(data.dueDate),
      subtotal: data.subtotal,
      tps: data.tps ?? 0,
      css: data.css ?? 0,
      vat: data.vat,
      total: data.total,
      currency: data.currency,
      notes: data.notes ?? null,
      paymentTerms: data.paymentTerms ?? null,
      validityDays: data.validityDays ?? null,
      executionTerms: data.executionTerms ?? null,
      incoterm: data.incoterm ?? null,
      shippingNotes: data.shippingNotes ?? null,
      disclaimer: data.disclaimer ?? null,
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

      const updated = await prisma.document.update({
        where: { id: data.id },
        data: {
          ...docData,
          createdById: existing.createdById,
          lines: {
            deleteMany: {},
            create: lines.map(({ id: _id, ...l }) => l),
          },
        },
        include: docInclude,
      });
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

    const created = await prisma.document.create({
      data: {
        ...docData,
        lines: { create: lines.map(({ id: _id, ...l }) => l) },
      },
      include: docInclude,
    });
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
  });

export const setDocumentStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      status: z.enum([
        "draft",
        "sent",
        "accepted",
        "rejected",
        "paid",
        "overdue",
        "archived",
        "cancelled",
      ]),
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
    const updated = await prisma.document.update({
      where: { id: data.id },
      data: { status: data.status },
      include: docInclude,
    });
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
  });

// ─── Notifications ───────────────────────────────────────────────────────

const notificationInclude = {
  document: { select: { type: true } },
} as const;

export const listNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const { staff } = await requireSession();
  const rows = await prisma.notification.findMany({
    where: { staffId: staff.id },
    include: notificationInclude,
    orderBy: { at: "desc" },
    take: 100,
  });
  return rows.map(mapNotification);
});

export const markAllNotificationsRead = createServerFn({ method: "POST" }).handler(
  async () => {
    const { staff } = await requireSession();
    await prisma.notification.updateMany({
      where: { staffId: staff.id, read: false },
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
      throw new Error("Accès refusé");
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
    };
    const row = await prisma.company.upsert({
      where: { cabinet: activeCabinet },
      create: { ...payload, cabinet: activeCabinet },
      update: payload,
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
