import type { LineItem } from "@/store/types";

export const DEFAULT_VAT_RATE = 18;
export const DEFAULT_CSS_RATE = 1;

function lineBase(item: LineItem) {
  return item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
}

export function computeTotals(items: LineItem[]) {
  const subtotal = items.reduce((a, b) => a + lineBase(b), 0);
  const tps = items.reduce((a, b) => a + lineBase(b) * ((b.tpsRate || 0) / 100), 0);
  const css = items.reduce((a, b) => a + lineBase(b) * ((b.cssRate || 0) / 100), 0);
  const vat = items.reduce((a, b) => a + lineBase(b) * ((b.vatRate || 0) / 100), 0);
  return { subtotal, tps, css, vat, total: subtotal + tps + css + vat };
}

/** Factures & devis : HT + CSS + TVA (pas de TPS). */
export function computeDocumentTotals(items: LineItem[]) {
  const normalized = items.map((it) => ({
    ...it,
    tpsRate: 0,
    cssRate: it.cssRate ?? DEFAULT_CSS_RATE,
    vatRate: it.vatRate ?? DEFAULT_VAT_RATE,
  }));
  const { subtotal, css, vat } = computeTotals(normalized);
  return { subtotal, tps: 0, css, vat, total: subtotal + css + vat };
}

/** @deprecated Utiliser {@link computeDocumentTotals} */
export const computeVatOnlyTotals = computeDocumentTotals;
/** @deprecated Utiliser {@link computeDocumentTotals} */
export const computeInvoiceTotals = computeDocumentTotals;

/** Taux document (1ʳᵉ ligne ou défauts). */
export function documentTaxRates(items: LineItem[]) {
  return {
    vatRate: items[0]?.vatRate ?? DEFAULT_VAT_RATE,
    cssRate: items[0]?.cssRate ?? DEFAULT_CSS_RATE,
  };
}

export function parseExecutionDays(executionTerms?: string | null, fallback = 15): number {
  if (!executionTerms) return fallback;
  const match = executionTerms.match(/(\d+)\s*jours?/i);
  if (!match) return fallback;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function formatExecutionTerms(days: number): string {
  const n = Math.max(1, Math.round(days) || 15);
  return `Délai d'exécution : ${n} jours ouvrés après acceptation du devis.`;
}
