import {
  createStorageAdmin,
  publicObjectUrl,
  sanitizeFileName,
} from "@/lib/client-fiches-storage";

export const DOCUMENT_EXPORTS_BUCKET = "document-exports";

export async function uploadExportBytes(params: {
  cabinet: string;
  jobId: string;
  fileName: string;
  bytes: Buffer;
  contentType: string;
}): Promise<{ path: string; fileUrl: string }> {
  const safe = sanitizeFileName(params.fileName) || "export";
  const path = `${params.cabinet}/exports/${params.jobId}/${safe}`;

  const supabase = createStorageAdmin();
  const { error } = await supabase.storage
    .from(DOCUMENT_EXPORTS_BUCKET)
    .upload(path, params.bytes, {
      contentType: params.contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload export impossible : ${error.message}`);
  }

  return {
    path,
    fileUrl: publicObjectUrl(DOCUMENT_EXPORTS_BUCKET, path),
  };
}

export async function downloadBytesFromPublicUrl(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fichier inaccessible (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}
