import {
  createStorageAdmin,
  publicObjectUrl,
  sanitizeFileName,
} from "@/lib/client-fiches-storage";

export const COMPANY_SIGNATURES_BUCKET = "company-signatures";

export async function uploadCompanySignatureBytes(params: {
  cabinet: "conseil" | "expertise_fiscale";
  bytes: Buffer;
  contentType: string;
  fileName?: string;
}): Promise<{ fileUrl: string; path: string }> {
  const ext =
    params.contentType === "image/webp"
      ? "webp"
      : params.contentType === "image/jpeg"
        ? "jpg"
        : "png";
  const safe = sanitizeFileName(params.fileName || `signature.${ext}`);
  const path = `${params.cabinet}/${Date.now()}-${safe}`;

  const supabase = createStorageAdmin();
  const { error } = await supabase.storage
    .from(COMPANY_SIGNATURES_BUCKET)
    .upload(path, params.bytes, {
      contentType: params.contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(
      `Upload signature impossible : ${error.message}. Vérifiez que le bucket « ${COMPANY_SIGNATURES_BUCKET} » existe et est public.`,
    );
  }

  return {
    path,
    fileUrl: publicObjectUrl(COMPANY_SIGNATURES_BUCKET, path),
  };
}
