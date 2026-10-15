import { createStorageAdmin, sanitizeFileName } from "@/lib/client-fiches-storage";

/** Bucket privé des justificatifs de dépenses (scripts/ensure-crm-receipts-bucket.mjs). */
export const CRM_RECEIPTS_BUCKET = "crm-receipts";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** Chemin `<staffId>/<horodatage>-<nom>` : l’auteur est vérifié à l’enregistrement. */
export async function uploadCrmReceiptFile(
  staffId: string,
  file: { fileName: string; contentType: string; base64: string },
): Promise<{ path: string; name: string }> {
  if (!ALLOWED_TYPES.includes(file.contentType)) {
    throw new Error("Justificatif : photo (JPEG, PNG, WebP) ou PDF uniquement");
  }
  const raw = Buffer.from(file.base64, "base64");
  if (raw.byteLength > MAX_BYTES) {
    throw new Error("Justificatif trop volumineux (6 Mo maximum)");
  }

  const safeName = sanitizeFileName(file.fileName) || "justificatif";
  const path = `${staffId}/${Date.now()}-${safeName}`;
  const supabase = createStorageAdmin();
  const { error } = await supabase.storage
    .from(CRM_RECEIPTS_BUCKET)
    .upload(path, raw, { contentType: file.contentType, upsert: false });
  if (error) {
    throw new Error(
      `Téléversement impossible : ${error.message}. Vérifiez que le bucket « ${CRM_RECEIPTS_BUCKET} » existe.`,
    );
  }
  return { path, name: file.fileName };
}

export async function createReceiptSignedUrl(path: string): Promise<string> {
  const supabase = createStorageAdmin();
  const { data, error } = await supabase.storage
    .from(CRM_RECEIPTS_BUCKET)
    .createSignedUrl(path, 10 * 60);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Lien du justificatif indisponible");
  }
  return data.signedUrl;
}
