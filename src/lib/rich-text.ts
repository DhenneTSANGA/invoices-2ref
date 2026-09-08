/** Utilitaires HTML pour les champs enrichis des courriers. */

export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

/** Convertit un ancien texte brut en HTML TipTap-compatible. */
export function plainTextToHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (looksLikeHtml(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((l) => escapeHtml(l))
        .join("<br>");
      return `<p>${lines || "<br>"}</p>`;
    })
    .join("");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Pour e-mail : HTML si déjà enrichi, sinon plain → <br>. */
export function richOrPlainToEmailHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (looksLikeHtml(trimmed)) return trimmed;
  return escapeHtml(trimmed).replace(/\n/g, "<br/>");
}

export function isRichTextEmpty(value: string | null | undefined): boolean {
  if (!value) return true;
  const text = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}
