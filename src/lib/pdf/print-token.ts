import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jeton signé autorisant le rendu PDF serveur d’un document.
 * Le cron ne peut pas générer le PDF (pas de DOM) : il ouvre une page
 * d’impression dans Chromium, protégée par ce jeton à durée limitée.
 */
const TOKEN_TTL_SECONDS = 15 * 60;

function tokenSecret(): string {
  const secret =
    process.env.PDF_RENDER_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("PDF_RENDER_SECRET (ou CRON_SECRET) manquant : rendu PDF serveur impossible.");
  }
  return secret;
}

function sign(documentId: string, exp: number): string {
  return createHmac("sha256", tokenSecret()).update(`${documentId}.${exp}`).digest("base64url");
}

export function createPdfRenderToken(documentId: string): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return `${exp}.${sign(documentId, exp)}`;
}

export function verifyPdfRenderToken(
  documentId: string,
  token: string | null | undefined,
): boolean {
  if (!token) return false;
  const [expRaw, signature] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || !signature) return false;
  if (exp * 1000 < Date.now()) return false;

  const expected = sign(documentId, exp);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
