import type { LineItem } from "@/store/types";

export function computeTotals(items: LineItem[]) {
  const subtotal = items.reduce(
    (a, b) => a + b.quantity * b.unitPrice * (1 - (b.discount || 0) / 100),
    0,
  );
  const vat = items.reduce(
    (a, b) =>
      a +
      b.quantity *
        b.unitPrice *
        (1 - (b.discount || 0) / 100) *
        (b.vatRate / 100),
    0,
  );
  return { subtotal, vat, total: subtotal + vat };
}
