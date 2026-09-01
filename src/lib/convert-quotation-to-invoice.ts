import type { z } from "zod";
import type { documentInputSchema } from "@/lib/auth-schemas";
import type { Document } from "@/store/types";

/** Construit le payload facture brouillon à partir d'un devis existant. */
export function buildInvoiceInputFromQuotation(
  quotation: Document,
): z.infer<typeof documentInputSchema> {
  const today = new Date().toISOString().slice(0, 10);

  return {
    type: "invoice",
    number: "FA-0000",
    clientId: quotation.clientId,
    status: "draft",
    issueDate: today,
    dueDate: quotation.dueDate ?? null,
    currency: quotation.currency,
    notes: quotation.notes ?? null,
    paymentTerms: quotation.paymentTerms ?? null,
    validityDays: null,
    executionTerms: null,
    subject: null,
    salutation: null,
    body: null,
    closing: null,
    signatoryTitle: quotation.signatoryTitle ?? null,
    recipientOverride: quotation.recipientOverride ?? null,
    sections: (quotation.sections ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      position: s.position,
    })),
    items: quotation.items.map((item) => ({
      serviceId: item.serviceId ?? null,
      sectionId: item.sectionId ?? null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      discount: item.discount,
      tpsRate: item.tpsRate,
      cssRate: item.cssRate,
    })),
    subtotal: quotation.subtotal,
    discount: quotation.discount ?? 0,
    tps: quotation.tps,
    css: quotation.css,
    vat: quotation.vat,
    total: quotation.total,
  };
}
