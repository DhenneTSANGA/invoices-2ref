import type { LineItem } from "@/store/types";

function lineBase(item: LineItem) {
  return item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
}

export function computeTotals(items: LineItem[]) {
  const subtotal = items.reduce((a, b) => a + lineBase(b), 0);
  const tps = items.reduce((a, b) => a + lineBase(b) * ((b.tpsRate || 0) / 100), 0);
  const css = items.reduce((a, b) => a + lineBase(b) * ((b.cssRate || 0) / 100), 0);
  const vat = items.reduce((a, b) => a + lineBase(b) * (b.vatRate / 100), 0);
  return { subtotal, tps, css, vat, total: subtotal + tps + css + vat };
}
