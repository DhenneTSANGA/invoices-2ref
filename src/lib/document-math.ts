import type { DiscountMode, LineItem } from "@/store/types";
import { lineQuantityForTotal } from "@/lib/line-quantity";

export const DEFAULT_VAT_RATE = 18;
export const DEFAULT_CSS_RATE = 1;
/** Taux proposé quand l’utilisateur active la TPS sur une facture (Congo). */
export const DEFAULT_TPS_RATE = 9.5;

function lineGross(item: LineItem) {
  return lineQuantityForTotal(item) * item.unitPrice;
}

/** Argent confié par le client pour des procédures : hors remise et hors taxes. */
export function isFundsLine(item: { billingKind?: string | null }) {
  return item.billingKind === "funds";
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
  /** Remise globale % sur la base taxable (honoraires). */
  discount?: number;
  /** percent = `discount` ; amount = `discountFixed` en XAF. */
  discountMode?: DiscountMode;
  /** Remise forfaitaire en XAF, plafonnée à la base taxable. */
  discountFixed?: number;
  vatRate?: number;
  cssRate?: number;
  /** 0 = TPS non appliquée (ne pas afficher). */
  tpsRate?: number;
  /** Ajustement manuel du TTC (XAF). */
  rounding?: number;
};

export type DocumentTotals = {
  /** Somme de toutes les lignes (sous-total 1). */
  grossSubtotal: number;
  /** Honoraires avant remise (base TVA/CSS). */
  serviceBase: number;
  /** Fonds de procédures, ajoutés après les taxes. */
  fundsAmount: number;
  /** Au moins une ligne « procédures ». */
  hasFunds: boolean;
  /** Montant de la remise document. */
  discountAmount: number;
  /** HT taxable après remise (sous-total 2). */
  subtotal: number;
  tps: number;
  css: number;
  vat: number;
  /** Arrondi TTC appliqué (peut être négatif). */
  rounding: number;
  /** Net à payer : taxable après taxes + fonds de procédures. */
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
 * Factures & devis : honoraires → remise → TPS (opt., déduite) + CSS + TVA.
 * Les lignes « fonds de procédures » sont dans le sous-total 1, hors remise et hors taxes,
 * puis ajoutées au net à payer. Si TPS > 0, la TVA est exclue.
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
  const discountMode: DiscountMode =
    opts.discountMode === "amount" ? "amount" : "percent";

  let serviceGross = 0;
  let fundsGross = 0;
  let hasFunds = false;
  for (const item of items) {
    const gross = lineGross(item);
    if (isFundsLine(item)) {
      hasFunds = true;
      fundsGross += gross;
    } else {
      serviceGross += gross;
    }
  }
  const fundsAmount = Math.round(fundsGross);
  // Sans fonds et en pourcentage : même arrondi qu’avant (remise sur la somme brute).
  const legacyPercent = !hasFunds && discountMode === "percent";
  const serviceBase = Math.round(serviceGross);
  const discountAmount = legacyPercent
    ? Math.round(serviceGross * (discountPct / 100))
    : discountMode === "amount"
      ? Math.min(serviceBase, Math.max(0, Math.round(opts.discountFixed ?? 0)))
      : Math.round(serviceBase * (discountPct / 100));
  const subtotal = Math.max(
    0,
    (legacyPercent ? Math.round(serviceGross) : serviceBase) - discountAmount,
  );
  const tps = Math.round(subtotal * (Math.max(0, tpsRate) / 100));
  const css = Math.round(subtotal * (Math.max(0, cssRate) / 100));
  const vat = Math.round(subtotal * (effectiveVat / 100));
  const rawTotal = commercialTotal(subtotal, tps, css, vat) + fundsAmount;
  const rounding = Number.isFinite(opts.rounding) ? Math.round(opts.rounding!) : 0;
  const total = Math.max(0, rawTotal + rounding);

  return {
    grossSubtotal: serviceBase + fundsAmount,
    serviceBase,
    fundsAmount,
    hasFunds,
    discountAmount,
    subtotal,
    tps,
    css,
    vat,
    rounding: total - rawTotal,
    total,
  };
}

/** Montants commerciaux pour une base HT (même logique que computeDocumentTotals, une ligne). */
function commercialAmountsFromHt(
  ht: number,
  vatRate = DEFAULT_VAT_RATE,
  cssRate = DEFAULT_CSS_RATE,
  tpsRate = 0,
) {
  const subtotal = Math.round(ht);
  const tps = Math.round(subtotal * (Math.max(0, tpsRate) / 100));
  const css = Math.round(subtotal * (Math.max(0, cssRate) / 100));
  const effectiveVat = effectiveCommercialVatRate(vatRate, tpsRate);
  const vat = Math.round(subtotal * (effectiveVat / 100));
  return {
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

/** TTC → HT : cherche le HT dont le recalcul TVA/CSS/TPS redonne exactement le TTC saisi. */
export function htFromTtc(
  ttc: number,
  vatRate = DEFAULT_VAT_RATE,
  cssRate = DEFAULT_CSS_RATE,
  tpsRate = 0,
): number {
  const target = Math.round(ttc);
  if (!Number.isFinite(target) || target === 0) return 0;

  const factor = commercialTaxFactor(vatRate, cssRate, tpsRate);
  const guess = factor <= 0 ? target : Math.round(target / factor);

  let bestHt = guess;
  let bestDiff = Infinity;
  // ±5 couvre les écarts d’arrondi XAF usuels (ex. 792 000 → HT 665 547, pas 665 546).
  for (let delta = -5; delta <= 5; delta++) {
    const candidate = guess + delta;
    if (candidate <= 0) continue;
    const { total } = commercialAmountsFromHt(candidate, vatRate, cssRate, tpsRate);
    const diff = Math.abs(total - target);
    if (diff === 0) return candidate;
    if (diff < bestDiff) {
      bestDiff = diff;
      bestHt = candidate;
    }
  }
  return bestHt;
}

/** HT → TTC (arrondi à l’unité XAF). */
export function ttcFromHt(
  ht: number,
  vatRate = DEFAULT_VAT_RATE,
  cssRate = DEFAULT_CSS_RATE,
  tpsRate = 0,
): number {
  if (!Number.isFinite(ht) || ht === 0) return 0;
  return commercialAmountsFromHt(ht, vatRate, cssRate, tpsRate).total;
}

/** Décomposition d’un montant TTC (ligne ou total). */
export function breakdownFromTtc(
  ttc: number,
  vatRate = DEFAULT_VAT_RATE,
  cssRate = DEFAULT_CSS_RATE,
  tpsRate = 0,
) {
  const subtotal = htFromTtc(ttc, vatRate, cssRate, tpsRate);
  const amounts = commercialAmountsFromHt(subtotal, vatRate, cssRate, tpsRate);
  return {
    subtotal: amounts.subtotal,
    tps: amounts.tps,
    css: amounts.css,
    vat: amounts.vat,
    total: amounts.total,
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

/** Acompte saisi (XAF), jamais négatif. */
export function normalizedDeposit(value?: number | null): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

/** TTC − acomptes (plancher 0). */
export function remainingDue(total: number, deposit?: number | null): number {
  return Math.max(0, Math.round(total) - normalizedDeposit(deposit));
}

export function isConseilInvoice(doc: {
  cabinet?: string | null;
  type?: string | null;
}): boolean {
  return doc.cabinet === "conseil" && doc.type === "invoice";
}

/** Bloc acomptes / reste à payer — papier 2R Conseil (facture et devis). */
export function showsConseilDeposits(doc: {
  cabinet?: string | null;
  type?: string | null;
}): boolean {
  return (
    doc.cabinet === "conseil" &&
    (doc.type === "invoice" || doc.type === "quotation" || !doc.type)
  );
}
