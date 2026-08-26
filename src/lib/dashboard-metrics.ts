import type { Document } from "@/store/types";

export type AmountBasis = "ht" | "ttc";

/** Factures comptées dans le CA : émises (signées / envoyées / payées / en retard). */
const ISSUED_STATUSES = new Set([
  "signed",
  "sent",
  "paid",
  "overdue",
]);

const MONTHS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jun",
  "Jul",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

export function isIssuedInvoice(doc: Document): boolean {
  return doc.type === "invoice" && ISSUED_STATUSES.has(doc.status);
}

export function isCollectedInvoice(doc: Document): boolean {
  return doc.type === "invoice" && doc.status === "paid";
}

export function documentAmount(doc: Document, basis: AmountBasis): number {
  return basis === "ht" ? doc.subtotal : doc.total;
}

export type DashboardMoneyTotals = {
  ca: number;
  collected: number;
  outstanding: number;
};

export function computeMoneyTotals(
  documents: Document[],
  basis: AmountBasis,
): DashboardMoneyTotals {
  let ca = 0;
  let collected = 0;
  for (const doc of documents) {
    if (!doc.type || doc.type !== "invoice") continue;
    const amount = documentAmount(doc, basis);
    if (isIssuedInvoice(doc)) ca += amount;
    if (isCollectedInvoice(doc)) collected += amount;
  }
  return {
    ca,
    collected,
    outstanding: Math.max(0, ca - collected),
  };
}

export type MonthlyRevenuePoint = {
  m: string;
  /** Clé YYYY-MM */
  key: string;
  ca: number;
  collected: number;
  devis: number;
};

/** Agrégats mensuels sur les N derniers mois (par date d’émission). */
export function buildMonthlyRevenue(
  documents: Document[],
  basis: AmountBasis,
  monthsBack = 6,
): MonthlyRevenuePoint[] {
  const now = new Date();
  const months: MonthlyRevenuePoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let ca = 0;
    let collected = 0;
    let devis = 0;

    for (const doc of documents) {
      if (!doc.issueDate.startsWith(key)) continue;
      if (doc.type === "quotation") {
        devis += documentAmount(doc, basis);
        continue;
      }
      if (doc.type !== "invoice") continue;
      const amount = documentAmount(doc, basis);
      if (isIssuedInvoice(doc)) ca += amount;
      if (isCollectedInvoice(doc)) collected += amount;
    }

    months.push({
      m: MONTHS[d.getMonth()],
      key,
      ca,
      collected,
      devis,
    });
  }

  return months;
}

/** Variation % du CA entre le dernier mois et le précédent (0 si pas de base). */
export function caGrowthPercent(points: MonthlyRevenuePoint[]): number {
  if (points.length < 2) return 0;
  const prev = points[points.length - 2].ca;
  const curr = points[points.length - 1].ca;
  if (prev <= 0) return 0;
  return ((curr - prev) / prev) * 100;
}
