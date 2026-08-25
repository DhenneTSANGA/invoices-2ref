/** Rôles de signature sur factures, devis et courriers. */
export const SIGNATORY_ROLES = [
  {
    value: "direction",
    label: "La Direction",
    title: "La Direction",
  },
  {
    value: "comptable",
    label: "Chef comptable",
    title: "Le Chef comptable",
  },
] as const;

export type SignatoryRole = (typeof SIGNATORY_ROLES)[number]["value"];

export const DEFAULT_SIGNATORY_TITLE = "La Direction";

export function resolveSignatoryRole(
  title?: string | null,
): SignatoryRole {
  const t = (title ?? "").trim().toLowerCase();
  if (t.includes("comptable")) return "comptable";
  return "direction";
}

export function isAccountantSignatory(title?: string | null): boolean {
  return resolveSignatoryRole(title) === "comptable";
}

export function signatoryDisplayName(title?: string | null): string {
  const role = resolveSignatoryRole(title);
  return SIGNATORY_ROLES.find((r) => r.value === role)?.title ?? DEFAULT_SIGNATORY_TITLE;
}

export function signatoryTitleForRole(role: SignatoryRole): string {
  return SIGNATORY_ROLES.find((r) => r.value === role)?.title ?? DEFAULT_SIGNATORY_TITLE;
}
