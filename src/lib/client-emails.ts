/** Nombre maximal d’adresses e-mail par client (principale incluse). */
export const MAX_CLIENT_EMAILS = 3;

function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Adresses supplémentaires nettoyées : sans doublon ni adresse principale, 2 max. */
export function normalizeExtraEmails(
  extras: readonly string[] | null | undefined,
  primary: string,
): string[] {
  const out: string[] = [];
  for (const raw of extras ?? []) {
    const email = raw.trim();
    if (!email) continue;
    if (primary.trim() && sameEmail(email, primary)) continue;
    if (out.some((e) => sameEmail(e, email))) continue;
    out.push(email);
  }
  return out.slice(0, MAX_CLIENT_EMAILS - 1);
}

/** Toutes les adresses du client : principale d’abord, puis les supplémentaires. */
export function clientEmails(client: {
  email?: string | null;
  extraEmails?: readonly string[] | null;
}): string[] {
  const primary = client.email?.trim() ?? "";
  const extras = normalizeExtraEmails(client.extraEmails, primary);
  return primary ? [primary, ...extras] : extras;
}

/** Garde les destinataires choisis qui appartiennent bien au client. */
export function pickClientRecipients(
  allowed: readonly string[],
  requested: readonly string[],
): string[] {
  return allowed.filter((e) => requested.some((r) => sameEmail(r, e)));
}
