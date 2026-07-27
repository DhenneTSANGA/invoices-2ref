import {
  createStorageAdmin,
  publicObjectUrl,
  sanitizeFileName,
} from "@/lib/client-fiches-storage";

export const DOCUMENT_PDFS_BUCKET = "document-pdfs";

export async function uploadDocumentPdfBytes(params: {
  cabinet: string;
  documentId: string;
  action: "download" | "email";
  fileName: string;
  bytes: Buffer;
}): Promise<{ path: string; fileUrl: string }> {
  const safe = sanitizeFileName(params.fileName).replace(/\.pdf$/i, "") || "document";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `${params.cabinet}/${params.documentId}/${params.action}-${stamp}-${safe}.pdf`;

  const supabase = createStorageAdmin();
  const { error } = await supabase.storage
    .from(DOCUMENT_PDFS_BUCKET)
    .upload(path, params.bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload PDF impossible : ${error.message}`);
  }

  return {
    path,
    fileUrl: publicObjectUrl(DOCUMENT_PDFS_BUCKET, path),
  };
}
