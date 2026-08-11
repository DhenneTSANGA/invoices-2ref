import type { LineItem } from "@/store/types";

export const DEFAULT_VAT_RATE = 18;
export const DEFAULT_CSS_RATE = 1;
/** Taux proposé quand l’utilisateur active la TPS sur une facture (Congo). */
export const DEFAULT_TPS_RATE = 9.5;

function lineGross(item: LineItem) {
  return item.quantity * item.unitPrice;
}

/** Base ligne avec remise ligne (courriers / legacy). */
function lineBase(item: LineItem) {
  return lineGross(item) * (1 - (item.discount || 0) / 100);
}

/** Total commercial : HT − TPS + CSS + TVA (TPS = déduction). */
export function commercialTotal(
  subtotal: number,
  tps: number,
  css: number,
  vat: number,
): number {
  return Math.max(0, Math.round(subtotal) - Math.round(tps) + Math.round(css) + Math.round(vat));
}

export function computeTotals(items: LineItem[]) {
  const subtotal = items.reduce((a, b) => a + lineBase(b), 0);
  const tps = items.reduce((a, b) => a + lineBase(b) * ((b.tpsRate || 0) / 100), 0);
  const css = items.reduce((a, b) => a + lineBase(b) * ((b.cssRate || 0) / 100), 0);
  const vat = items.reduce((a, b) => a + lineBase(b) * ((b.vatRate || 0) / 100), 0);
  return { subtotal, tps, css, vat, total: commercialTotal(subtotal, tps, css, vat) };
}

export type DocumentTotalsOptions = {
  /** Remise globale % sur le sous-total HT brut. */
  discount?: number;
  vatRate?: number;
  cssRate?: number;
  /** 0 = TPS non appliquée (ne pas afficher). */
  tpsRate?: number;
};

export type DocumentTotals = {
  /** Somme des lignes HT avant remise document. */
  grossSubtotal: number;
  /** Montant de la remise document. */
  discountAmount: number;
  /** HT net (base taxable CSS / TVA). */
  subtotal: number;
  tps: number;
  css: number;
  vat: number;
  total: number;
};

/** TPS active → pas de TVA (factures & devis). */
export function effectiveCommercialVatRate(
  vatRate: number,
  tpsRate: number,
): number {
  return tpsRate > 0 ? 0 : Math.max(0, vatRate);
}

/**
 * Factures & devis : HT brut → remise → TPS (opt., déduite) + CSS + TVA sur le HT net.
 * Si TPS > 0, la TVA est exclue. Total = HT − TPS + CSS (+ TVA).
 */
export function computeDocumentTotals(
  items: LineItem[],
  opts: DocumentTotalsOptions = {},
): DocumentTotals {
  const rates = documentTaxRates(items);
  const vatRate = opts.vatRate ?? rates.vatRate;
  const cssRate = opts.cssRate ?? rates.cssRate;
  const tpsRate = opts.tpsRate ?? rates.tpsRate;
  const effectiveVat = effectiveCommercialVatRate(vatRate, tpsRate);
  const discountPct = Math.min(100, Math.max(0, opts.discount ?? 0));

  const grossSubtotal = items.reduce((a, b) => a + lineGross(b), 0);
  const discountAmount = Math.round(grossSubtotal * (discountPct / 100));
  const subtotal = Math.max(0, Math.round(grossSubtotal) - discountAmount);
  const tps = Math.round(subtotal * (Math.max(0, tpsRate) / 100));
  const css = Math.round(subtotal * (Math.max(0, cssRate) / 100));
  const vat = Math.round(subtotal * (effectiveVat / 100));

  return {
    grossSubtotal: Math.round(grossSubtotal),
    discountAmount,
    subtotal,
    tps,
    css,
    vat,
    total: commercialTotal(subtotal, tps, css, vat),
  };
}

/** Facteur TTC = HT × (1 − TPS% + CSS% + TVA%). TPS active → TVA exclue. */
export function commercialTaxFactor(
  vatRate = DEFAULT_VAT_RATE,
  cssRate = DEFAULT_CSS_RATE,
  tpsRate = 0,
): number {
  const effectiveVat = effectiveCommercialVatRate(vatRate, tpsRate);
  return (
    1 +
    (Math.max(0, cssRate) + effectiveVat - Math.max(0, tpsRate)) / 100
  );
}

/** TTC → HT (arrondi à l’unité XAF). */
export function htFromTtc(
  ttc: number,
  vatRate = DEFAULT_VAT_RATE,
  cssRate = DEFAULT_CSS_RATE,
  tpsRate = 0,
): number {
  const factor = commercialTaxFactor(vatRate, cssRate, tpsRate);
  if (!Number.isFinite(ttc) || ttc === 0) return 0;
  if (factor <= 0) return Math.round(ttc);
  return Math.round(ttc / factor);
}

/** HT → TTC (arrondi à l’unité XAF). */
export function ttcFromHt(
  ht: number,
  vatRate = DEFAULT_VAT_RATE,
  cssRate = DEFAULT_CSS_RATE,
  tpsRate = 0,
): number {
  if (!Number.isFinite(ht) || ht === 0) return 0;
  return Math.round(ht * commercialTaxFactor(vatRate, cssRate, tpsRate));
}

/** Décomposition d’un montant TTC (ligne ou total). */
export function breakdownFromTtc(
  ttc: number,
  vatRate = DEFAULT_VAT_RATE,
  cssRate = DEFAULT_CSS_RATE,
  tpsRate = 0,
) {
  const effectiveVat = effectiveCommercialVatRate(vatRate, tpsRate);
  const subtotal = htFromTtc(ttc, vatRate, cssRate, tpsRate);
  const tps = Math.round(subtotal * (Math.max(0, tpsRate) / 100));
  const css = Math.round(subtotal * (Math.max(0, cssRate) / 100));
  const vat = Math.round(subtotal * (effectiveVat / 100));
  const computed = commercialTotal(subtotal, tps, css, vat);
  const drift = Math.round(ttc) - computed;
  return {
    subtotal,
    tps,
    css: css + (tpsRate > 0 ? drift : 0),
    vat: vat + (tpsRate === 0 ? drift : 0),
    total: Math.round(ttc),
  };
}

/** @deprecated Utiliser {@link computeDocumentTotals} */
export const computeVatOnlyTotals = computeDocumentTotals;
/** @deprecated Utiliser {@link computeDocumentTotals} */
export const computeInvoiceTotals = computeDocumentTotals;

/** Taux document (max TPS sur les lignes ; TVA/CSS de la 1ʳᵉ ligne ou défauts). */
export function documentTaxRates(items: LineItem[]) {
  const tpsRate = items.reduce((m, it) => Math.max(m, it.tpsRate || 0), 0);
  return {
    vatRate: items[0]?.vatRate ?? DEFAULT_VAT_RATE,
    cssRate: items[0]?.cssRate ?? DEFAULT_CSS_RATE,
    tpsRate,
  };
}

/** Applique les taux document à toutes les lignes. */
export function withDocumentTaxRates(
  items: LineItem[],
  vatRate: number,
  cssRate: number,
  tpsRate = 0,
): LineItem[] {
  return items.map((it) => ({
    ...it,
    vatRate,
    cssRate,
    discount: 0,
    tpsRate: Math.max(0, tpsRate),
  }));
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
