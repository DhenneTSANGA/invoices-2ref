/** Helpers partagés pour les envois Resend. */

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatFrom(displayName: string, email: string): string {
  const safeName = displayName.replaceAll('"', "").trim() || "2R Hub";
  return `"${safeName}" <${bareEmail(email)}>`;
}

/** Extrait l’adresse seule depuis `Name <addr@x>` ou une adresse brute. */
export function bareEmail(value: string): string {
  const trimmed = value.trim();
  const m = trimmed.match(/<([^>\s]+@[^>\s]+)>/);
  if (m?.[1]) return m[1].trim();
  return trimmed;
}

export type CompanyMailFields = {
  name: string;
  email: string;
  mailFromEmail?: string | null;
  mailReplyTo?: string | null;
};

/**
 * From / Reply-To selon la fiche cabinet.
 * Fallback : RESEND_FROM_EMAIL / RESEND_REPLY_TO (legacy).
 */
export function resolveCabinetMailAddresses(company: CompanyMailFields): {
  from: string;
  replyTo: string | undefined;
  fromAddress: string;
} {
  const rawFrom =
    company.mailFromEmail?.trim() ||
    company.email?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "";
  if (!rawFrom) {
    throw new Error(
      "Aucune adresse d’envoi : renseignez « Adresse d’envoi » dans Paramètres du cabinet (domaine vérifié Resend).",
    );
  }

  const fromAddress = bareEmail(rawFrom);
  const from = formatFrom(company.name, fromAddress);

  const rawReply =
    company.mailReplyTo?.trim() ||
    fromAddress ||
    process.env.RESEND_REPLY_TO?.trim() ||
    "";
  const replyTo = rawReply ? bareEmail(rawReply) : undefined;

  return { from, replyTo, fromAddress };
}

export function resendErrorMessage(error: unknown): string {
  if (!error) return "Erreur Resend inconnue";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const e = error as { message?: string; name?: string };
    const parts = [e.name, e.message].filter(Boolean);
    if (parts.length) return parts.join(": ");
  }
  return "Erreur Resend inconnue";
}

export function requireResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY manquante — ajoutez-la dans .env puis redémarrez pnpm dev",
    );
  }
  return apiKey;
}

/** @deprecated Préférer resolveCabinetMailAddresses + requireResendApiKey */
export function requireResendConfig(): { apiKey: string; fromEmail: string } {
  const apiKey = requireResendApiKey();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!fromEmail) {
    throw new Error(
      "RESEND_FROM_EMAIL manquant — ou configurez l’adresse d’envoi dans Paramètres du cabinet",
    );
  }
  return { apiKey, fromEmail };
}
