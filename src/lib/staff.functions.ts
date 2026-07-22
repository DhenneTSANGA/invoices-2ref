import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mapDocument } from "@/lib/mappers";

const upsertStaffSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  jobTitle: z.string().min(1),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  role: z.enum(["member", "admin", "super_admin"]).optional(),
  cabinet: z.enum(["conseil", "expertise_fiscale"]).optional().nullable(),
});

export const upsertStaffMember = createServerFn({ method: "POST" })
  .validator(upsertStaffSchema)
  .handler(async ({ data }) => {
    const { syncStaffMember } = await import("@/lib/staff-sync");
    return syncStaffMember(data);
  });

export const getStaffById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { prisma } = await import("@/lib/prisma");
    const { mapStaff } = await import("@/lib/mappers");
    const row = await prisma.staffMember.findUnique({ where: { id: data.id } });
    return row ? mapStaff(row) : null;
  });

/** Liste documents visibles selon le rôle (admin/super = tous du filtre). */
export const listDocumentsForStaff = createServerFn({ method: "GET" })
  .validator(
    z.object({
      staffId: z.string(),
      role: z.enum(["member", "admin", "super_admin"]),
      type: z.enum(["quotation", "invoice", "proforma", "letter"]).optional(),
      cabinet: z.enum(["conseil", "expertise_fiscale"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.document.findMany({
      where: {
        ...(data.cabinet ? { cabinet: data.cabinet } : {}),
        ...(data.role === "member" ? { createdById: data.staffId } : {}),
        ...(data.type ? { type: data.type } : {}),
      },
      include: {
        client: true,
        createdBy: true,
        lines: { orderBy: { position: "asc" } },
      },
      orderBy: { issueDate: "desc" },
    });
    return rows.map(mapDocument);
  });

export const getDocumentForStaff = createServerFn({ method: "GET" })
  .validator(
    z.object({
      id: z.string(),
      staffId: z.string(),
      role: z.enum(["member", "admin", "super_admin"]),
    }),
  )
  .handler(async ({ data }) => {
    const { prisma } = await import("@/lib/prisma");
    const doc = await prisma.document.findUnique({
      where: { id: data.id },
      include: {
        client: true,
        createdBy: true,
        lines: { orderBy: { position: "asc" } },
      },
    });
    if (!doc) return null;
    if (data.role === "member" && doc.createdById !== data.staffId) {
      // membres voient en lecture — on renvoie quand même
      return mapDocument(doc);
    }
    return mapDocument(doc);
  });

export const listClients = createServerFn({ method: "GET" }).handler(
  async () => {
    const { prisma } = await import("@/lib/prisma");
    const { mapClient } = await import("@/lib/mappers");
    const rows = await prisma.client.findMany({ orderBy: { name: "asc" } });
    return rows.map(mapClient);
  },
);
