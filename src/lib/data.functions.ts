import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { mapClient, mapDocument, mapService, mapCompany } from "@/lib/mappers";
import { clientInputSchema, documentInputSchema, companyInputSchema } from "@/lib/auth-schemas";
import { REAL_2REF_COMPANY } from "@/lib/company-defaults";
import { getCurrentSession } from "@/lib/session.functions";

const docInclude = {
  lines: { orderBy: { position: "asc" as const } },
  createdBy: true,
  client: true,
};

async function requireStaff() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  return session.staff;
}

function documentWhere(staffId: string, role: "member" | "admin", type?: string) {
  return {
    ...(role === "admin" ? {} : { createdById: staffId }),
    ...(type ? { type: type as "quotation" | "invoice" | "proforma" | "letter" } : {}),
  };
}

// ─── Clients ───────────────────────────────────────────────────────────────

export const listClients = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const rows = await prisma.client.findMany({ orderBy: { name: "asc" } });
  return rows.map(mapClient);
});

export const getClient = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireStaff();
    const row = await prisma.client.findUnique({ where: { id: data.id } });
    return row ? mapClient(row) : null;
  });

export const createClient = createServerFn({ method: "POST" })
  .validator(clientInputSchema)
  .handler(async ({ data }) => {
    await requireStaff();
    const row = await prisma.client.create({ data });
    return mapClient(row);
  });

export const updateClient = createServerFn({ method: "POST" })
  .validator(clientInputSchema.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireStaff();
    const { id, ...rest } = data;
    const row = await prisma.client.update({ where: { id }, data: rest });
    return mapClient(row);
  });

export const deleteClient = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireStaff();
    await prisma.client.delete({ where: { id: data.id } });
    return { ok: true };
  });

// ─── Services ──────────────────────────────────────────────────────────────

export const listServices = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const rows = await prisma.service.findMany({ orderBy: { name: "asc" } });
  return rows.map(mapService);
});

// ─── Documents ───────────────────────────────────────────────────────────

export const listDocuments = createServerFn({ method: "GET" })
  .validator(
    z.object({
      type: z.enum(["quotation", "invoice", "proforma", "letter"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const rows = await prisma.document.findMany({
      where: documentWhere(staff.id, staff.role, data.type),
      include: docInclude,
      orderBy: { issueDate: "desc" },
    });
    return rows.map(mapDocument);
  });

export const getDocument = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const row = await prisma.document.findUnique({
      where: { id: data.id },
      include: docInclude,
    });
    if (!row) return null;
    if (staff.role !== "admin" && row.createdById !== staff.id) return null;
    return mapDocument(row);
  });

export const upsertDocument = createServerFn({ method: "POST" })
  .validator(documentInputSchema)
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const lines = data.items.map((item, position) => ({
      id: item.id,
      serviceId: item.serviceId ?? null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      discount: item.discount ?? 0,
      position,
    }));

    const docData = {
      type: data.type,
      number: data.number,
      clientId: data.clientId,
      createdById: staff.id,
      status: data.status,
      issueDate: new Date(data.issueDate),
      dueDate: new Date(data.dueDate),
      subtotal: data.subtotal,
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
      const existing = await prisma.document.findUnique({ where: { id: data.id } });
      if (!existing) throw new Error("Document introuvable");
      if (staff.role !== "admin" && existing.createdById !== staff.id) {
        throw new Error("Accès refusé");
      }

      const row = await prisma.$transaction(async (tx) => {
        await tx.documentLine.deleteMany({ where: { documentId: data.id! } });
        return tx.document.update({
          where: { id: data.id },
          data: {
            ...docData,
            lines: {
              create: lines.map(({ id: _id, ...l }) => l),
            },
          },
          include: docInclude,
        });
      });
      return mapDocument(row);
    }

    const row = await prisma.document.create({
      data: {
        ...docData,
        lines: { create: lines.map(({ id: _id, ...l }) => l) },
      },
      include: docInclude,
    });
    return mapDocument(row);
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
    const staff = await requireStaff();
    const existing = await prisma.document.findUnique({ where: { id: data.id } });
    if (!existing) throw new Error("Document introuvable");
    if (staff.role !== "admin" && existing.createdById !== staff.id) {
      throw new Error("Accès refusé");
    }
    const row = await prisma.document.update({
      where: { id: data.id },
      data: { status: data.status },
      include: docInclude,
    });
    return mapDocument(row);
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const existing = await prisma.document.findUnique({ where: { id: data.id } });
    if (!existing) throw new Error("Document introuvable");
    if (staff.role !== "admin" && existing.createdById !== staff.id) {
      throw new Error("Accès refusé");
    }
    await prisma.document.delete({ where: { id: data.id } });
    return { ok: true };
  });

// ─── Company ───────────────────────────────────────────────────────────────

export const getCompany = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const row = await prisma.company.findFirst();
  return row ? mapCompany(row) : REAL_2REF_COMPANY;
});

export const updateCompany = createServerFn({ method: "POST" })
  .validator(companyInputSchema)
  .handler(async ({ data }) => {
    await requireStaff();
    const existing = await prisma.company.findFirst();
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
    const row = existing
      ? await prisma.company.update({ where: { id: existing.id }, data: payload })
      : await prisma.company.create({ data: payload });
    return mapCompany(row);
  });
