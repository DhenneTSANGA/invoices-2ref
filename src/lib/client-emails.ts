/** Nombre maximal d’adresses e-mail par client (principale incluse). */
export const MAX_CLIENT_EMAILS = 3;

export type EmailCivility = "" | "Monsieur" | "Madame";

/** Adresse e-mail du client et personne à qui elle appartient (salutation). */
export type ClientEmailContact = {
  email: string;
  civility: EmailCivility;
  name: string;
};

function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function normalizeCivility(value: unknown): EmailCivility {
  return value === "Monsieur" || value === "Madame" ? value : "";
}

/** Adresses supplémentaires nettoyées : sans doublon ni adresse principale, 2 max. */
export function normalizeExtraEmailContacts(
  extras: readonly Partial<ClientEmailContact>[] | null | undefined,
  primary: string,
): ClientEmailContact[] {
  const out: ClientEmailContact[] = [];
  for (const raw of extras ?? []) {
    const email = (raw.email ?? "").trim();
    if (!email) continue;
    if (primary.trim() && sameEmail(email, primary)) continue;
    if (out.some((e) => sameEmail(e.email, email))) continue;
    out.push({
      email,
      civility: normalizeCivility(raw.civility),
      name: (raw.name ?? "").trim(),
    });
  }
  return out.slice(0, MAX_CLIENT_EMAILS - 1);
}

/**
 * Toutes les adresses du client, principale d’abord.
 * L’adresse principale reprend la civilité et le représentant de la fiche.
 */
export function clientEmailContacts(client: {
  email?: string | null;
  civility?: string | null;
  contactName?: string | null;
  extraEmailContacts?: readonly Partial<ClientEmailContact>[] | null;
}): ClientEmailContact[] {
  const primary = client.email?.trim() ?? "";
  const extras = normalizeExtraEmailContacts(client.extraEmailContacts, primary);
  return primary
    ? [
        {
          email: primary,
          civility: normalizeCivility(client.civility),
          name: client.contactName?.trim() ?? "",
        },
        ...extras,
      ]
    : extras;
}

/** Garde les destinataires choisis qui appartiennent bien au client. */
export function pickClientRecipients(
  allowed: readonly ClientEmailContact[],
  requested: readonly string[],
): ClientEmailContact[] {
  return allowed.filter((c) => requested.some((r) => sameEmail(r, c.email)));
}

/** « Bonjour Madame Nzé, » — d’après la personne qui reçoit le mail. */
export function emailGreeting(contact: Pick<ClientEmailContact, "civility" | "name">): string {
  const civ = normalizeCivility(contact.civility);
  const name = contact.name.trim();
  if (civ && name) return `Bonjour ${civ} ${name},`;
  if (civ) return `Bonjour ${civ},`;
  if (name) return `Bonjour ${name},`;
  return "Bonjour Madame, Monsieur,";
}

/** Libellé court pour les listes de choix (« Madame Nzé »). */
export function emailContactLabel(contact: Pick<ClientEmailContact, "civility" | "name">): string {
  return [contact.civility, contact.name.trim()].filter(Boolean).join(" ");
}
