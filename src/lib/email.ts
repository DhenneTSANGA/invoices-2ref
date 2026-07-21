/** Helpers partagés pour les envois Resend. */

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatFrom(displayName: string, email: string): string {
  const safeName = displayName.replaceAll('"', "").trim() || "2REF";
  return `"${safeName}" <${email}>`;
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

export function requireResendConfig(): { apiKey: string; fromEmail: string } {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY manquante — ajoutez-la dans .env puis redémarrez pnpm dev",
    );
  }
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!fromEmail) {
    throw new Error(
      "RESEND_FROM_EMAIL manquant — utilisez une adresse d'un domaine vérifié dans Resend",
    );
  }
  return { apiKey, fromEmail };
}
