import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session.functions";
import { isAdmin, isSuperAdmin } from "@/lib/roles";
import {
  assertInvoiceManagerAllowed,
  loadInvoiceManagerOptions,
  persistInvoicePaidAt,
  persistInvoiceProspectionManager,
  type ProspectionManagerOption,
} from "@/lib/document-prospection-db";

/**
 * Facturation → Prospection : choix du manager apporteur d’une facture, pour suivre
 * l’encaissé de chaque manager dans l’espace Prospection.
 */

async function requireSession() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  return session;
}

export type InvoiceProspectionContext = {
  managers: ProspectionManagerOption[];
  /** Client de la Facturation relié à une fiche Prospection → manager de la fiche (suggestion). */
  clientManagers: Record<string, string>;
};

export const getInvoiceProspectionContext = createServerFn({ method: "GET" }).handler(
  async (): Promise<InvoiceProspectionContext> => {
    const session = await requireSession();
    const cabinet = session.activeCabinet;
    const managers = await loadInvoiceManagerOptions(cabinet);
    const allowed = new Set(managers.map((m) => m.id));
    const linked = await prisma.crmCompany.findMany({
      where: { cabinet, clientId: { not: null } },
      select: { clientId: true, managerId: true },
    });
    const clientManagers: Record<string, string> = {};
    for (const row of linked) {
      if (row.clientId && row.managerId && allowed.has(row.managerId)) {
        clientManagers[row.clientId] = row.managerId;
      }
    }
    return { managers, clientManagers };
  },
);

/** Correction du manager apporteur, y compris sur une facture figée (administrateurs). */
export const setInvoiceProspectionManager = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), managerId: z.string().min(1).nullable() }))
  .handler(async ({ data }) => {
    const session = await requireSession();
    if (!isAdmin(session.staff.role)) {
      throw new Error("Seul un administrateur peut changer le manager d’une facture enregistrée.");
    }
    const doc = await prisma.document.findFirst({
      where: isSuperAdmin(session.staff.role)
        ? { id: data.id, type: "invoice" }
        : { id: data.id, type: "invoice", cabinet: session.activeCabinet },
      select: { id: true, cabinet: true },
    });
    if (!doc) throw new Error("Facture introuvable");
    await assertInvoiceManagerAllowed(data.managerId, doc.cabinet);
    await persistInvoiceProspectionManager(doc.id, data.managerId);
    return { id: doc.id, managerId: data.managerId };
  });

/** Date d’encaissement réelle d’une facture payée (administrateurs). */
export const setInvoicePaidAt = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(async ({ data }) => {
    const session = await requireSession();
    if (!isAdmin(session.staff.role)) {
      throw new Error("Seul un administrateur peut modifier la date d’encaissement.");
    }
    const doc = await prisma.document.findFirst({
      where: isSuperAdmin(session.staff.role)
        ? { id: data.id, type: "invoice" }
        : { id: data.id, type: "invoice", cabinet: session.activeCabinet },
      select: { id: true, status: true },
    });
    if (!doc) throw new Error("Facture introuvable");
    if (doc.status !== "paid") throw new Error("La facture doit être marquée payée.");
    const paidAt = new Date(`${data.paidAt}T12:00:00.000Z`);
    if (paidAt.getTime() > Date.now() + 86_400_000) {
      throw new Error("La date d’encaissement ne peut pas être dans le futur.");
    }
    await persistInvoicePaidAt(doc.id, paidAt);
    return { id: doc.id, paidAt: paidAt.toISOString() };
  });
