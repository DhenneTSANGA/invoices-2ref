import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const upsertStaffSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  jobTitle: z.string().min(1),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  role: z.enum(["member", "admin"]).optional(),
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
    return prisma.staffMember.findUnique({ where: { id: data.id } });
  });

/** Liste documents visibles selon le rôle (admin = tous). */
export const listDocumentsForStaff = createServerFn({ method: "GET" })
  .validator(
    z.object({
      staffId: z.string(),
      role: z.enum(["member", "admin"]),
      type: z.enum(["quotation", "invoice", "proforma", "letter"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { prisma } = await import("@/lib/prisma");
    return prisma.document.findMany({
      where: {
        ...(data.role === "admin" ? {} : { createdById: data.staffId }),
        ...(data.type ? { type: data.type } : {}),
      },
      include: {
        client: true,
        createdBy: true,
        lines: { orderBy: { position: "asc" } },
      },
      orderBy: { issueDate: "desc" },
    });
  });

export const getDocumentForStaff = createServerFn({ method: "GET" })
  .validator(
    z.object({
      id: z.string(),
      staffId: z.string(),
      role: z.enum(["member", "admin"]),
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
    if (data.role !== "admin" && doc.createdById !== data.staffId) return null;
    return doc;
  });

export const listClients = createServerFn({ method: "GET" }).handler(
  async () => {
    const { prisma } = await import("@/lib/prisma");
    return prisma.client.findMany({ orderBy: { name: "asc" } });
  },
);
