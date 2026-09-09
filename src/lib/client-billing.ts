import type { ClientBillingProfile } from "@/store/types";

export const CLIENT_BILLING_PROFILES = [
  "subscription",
  "one_off",
  "mixed",
] as const satisfies readonly ClientBillingProfile[];

export const CLIENT_BILLING_LABELS: Record<ClientBillingProfile, string> = {
  subscription: "Abonnement",
  one_off: "Ponctuel",
  mixed: "Abonnement & ponctuel",
};

export const CLIENT_BILLING_HINTS: Record<ClientBillingProfile, string> = {
  subscription:
    "Facturation récurrente mensuelle à partir d’une facture modèle.",
  one_off: "Prestations ponctuelles uniquement (factures / devis classiques).",
  mixed: "Peut cumuler abonnements et missions ponctuelles.",
};

export function clientBillingLabel(
  profile: ClientBillingProfile | null | undefined,
): string {
  return CLIENT_BILLING_LABELS[profile ?? "mixed"];
}

/** Peut activer une facture modèle d’abonnement. */
export function clientAllowsSubscription(
  profile: ClientBillingProfile | null | undefined,
): boolean {
  return profile === "subscription" || profile === "mixed";
}

/** Facture modèle qui déclenche l’envoi mensuel. */
export function isSubscriptionTemplateInvoice(doc: {
  isSubscription?: boolean;
  subscriptionOfId?: string | null;
}): boolean {
  return Boolean(doc.isSubscription && !doc.subscriptionOfId);
}

/** Facture émise automatiquement depuis un modèle d’abonnement. */
export function isSubscriptionGeneratedInvoice(doc: {
  subscriptionOfId?: string | null;
}): boolean {
  return Boolean(doc.subscriptionOfId);
}

export function isClientBillingProfile(
  value: string,
): value is ClientBillingProfile {
  return (CLIENT_BILLING_PROFILES as readonly string[]).includes(value);
}
