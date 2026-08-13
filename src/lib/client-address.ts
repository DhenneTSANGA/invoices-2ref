/** Formate la BP client (ajoute le préfixe BP si absent). */
export function formatClientBp(bp: string | null | undefined): string {
  const raw = bp?.trim() ?? "";
  if (!raw) return "";
  if (/^BP\b/i.test(raw)) return raw;
  return `BP ${raw}`;
}

/**
 * Ligne d’adresse type émetteur : « BP 2963, Nouveau-Port, Lot 007 ».
 * Si l’adresse contient déjà la BP, on ne la répète pas.
 */
export function clientStreetLine(client: {
  address?: string | null;
  bp?: string | null;
}): string {
  const address = client.address?.trim() ?? "";
  const bp = formatClientBp(client.bp);
  if (bp && address) {
    if (
      address.toLowerCase().includes(bp.toLowerCase()) ||
      /^BP\b/i.test(address)
    ) {
      return address;
    }
    return `${bp}, ${address}`;
  }
  return bp || address;
}

/** Lignes d’identité client sur facture / devis (même ordre que l’émetteur). */
export function clientDocumentLines(client: {
  address?: string | null;
  bp?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
}): string[] {
  const contact = [client.phone?.trim(), client.email?.trim()]
    .filter(Boolean)
    .join(" · ");
  return [
    clientStreetLine(client),
    [client.city?.trim(), client.country?.trim()].filter(Boolean).join(", "),
    contact,
  ].filter(Boolean);
}

/** Ligne postale pour courriers : BP — ville — pays. */
export function clientLetterPostalLine(client: {
  bp?: string | null;
  city?: string | null;
  country?: string | null;
}): string {
  return [formatClientBp(client.bp), client.city?.trim(), client.country?.trim()]
    .filter(Boolean)
    .join(" — ");
}

/** Dénomination avec sigle éventuel. */
export function clientDisplayName(client: {
  name?: string | null;
  sigle?: string | null;
}): string {
  const name = client.name?.trim() ?? "";
  const sigle = client.sigle?.trim() ?? "";
  if (!name) return sigle;
  if (!sigle) return name;
  return `${name} (${sigle})`;
}

/** Représentant légal + qualité. */
export function clientRepresentativeLine(client: {
  contactName?: string | null;
  representativeTitle?: string | null;
}): string {
  const name = client.contactName?.trim() ?? "";
  if (!name) return "";
  const title = client.representativeTitle?.trim() ?? "";
  return title ? `${name}, ${title}` : name;
}

/** Bloc destinataire courrier (lignes). */
export function clientLetterRecipientLines(client: {
  name?: string | null;
  sigle?: string | null;
  contactName?: string | null;
  representativeTitle?: string | null;
  bp?: string | null;
  city?: string | null;
  country?: string | null;
}): string[] {
  const rep = clientRepresentativeLine(client);
  const display = clientDisplayName(client);
  return [
    rep ? "À" : "",
    rep,
    display ? `De ${display}` : "",
    clientLetterPostalLine(client),
  ].filter(Boolean);
}
