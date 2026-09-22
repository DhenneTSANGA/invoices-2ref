/** Unité de la colonne quantité : même calcul (n × P.U. HT), libellé différent. */
export const LINE_QUANTITY_UNITS = ["quantity", "month", "year", "none"] as const;
export type LineQuantityUnit = (typeof LINE_QUANTITY_UNITS)[number];

const UNIT_SET = new Set<string>(LINE_QUANTITY_UNITS);

export function parseLineQuantityUnit(value: unknown): LineQuantityUnit {
  return typeof value === "string" && UNIT_SET.has(value)
    ? (value as LineQuantityUnit)
    : "quantity";
}

export const LINE_QUANTITY_UNIT_OPTIONS: {
  value: LineQuantityUnit;
  label: string;
}[] = [
  { value: "quantity", label: "Qté" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Année" },
  { value: "none", label: "—" },
];

type QtyLine = {
  quantity: number;
  quantityUnit?: LineQuantityUnit | null;
};

/** Quantité utilisée pour le total : mois/année = quantité ; aucune = 1 (forfait). */
export function lineQuantityForTotal(item: QtyLine): number {
  if (parseLineQuantityUnit(item.quantityUnit) === "none") return 1;
  const n = Number(item.quantity);
  return Number.isFinite(n) ? n : 0;
}

export function quantityColumnHeader(items: QtyLine[]): string | null {
  if (items.length === 0) return "Qté";
  const units = items.map((it) => parseLineQuantityUnit(it.quantityUnit));
  if (units.every((u) => u === "none")) return null;
  const visible = [...new Set(units.filter((u) => u !== "none"))];
  if (visible.length === 1) {
    if (visible[0] === "month") return "Mois";
    if (visible[0] === "year") return "Année";
  }
  return "Qté";
}

export function hasMixedQuantityUnits(items: QtyLine[]): boolean {
  const visible = new Set(
    items
      .map((it) => parseLineQuantityUnit(it.quantityUnit))
      .filter((u) => u !== "none"),
  );
  return visible.size > 1;
}

function formatQuantityNumber(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (Number.isInteger(n)) return String(n);
  return String(n);
}

/** Valeur affichée dans la cellule (vide si unité « aucune »). */
export function formatLineQuantity(
  item: QtyLine,
  opts?: { mixed?: boolean },
): string {
  const unit = parseLineQuantityUnit(item.quantityUnit);
  if (unit === "none") return "";
  const num = formatQuantityNumber(Number(item.quantity));
  if (!num) return "";
  if (!opts?.mixed) return num;
  if (unit === "month") return `${num} mois`;
  if (unit === "year") return Number(item.quantity) === 1 ? `${num} an` : `${num} ans`;
  return num;
}

/** Heuristique catalogue : « mois » / « année ». */
export function quantityUnitFromServiceUnit(unit: string): LineQuantityUnit {
  const u = unit.trim().toLowerCase();
  if (/^(mois|month|m)$/.test(u)) return "month";
  if (/^(an|ans|année|annee|year|a|y)$/.test(u)) return "year";
  return "quantity";
}
