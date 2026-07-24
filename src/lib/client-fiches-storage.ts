import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

export const CLIENT_FICHES_BUCKET = "client-fiches";

/** Client Storage avec clé secrète (upload serveur). */
export function createStorageAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SECRET_KEY manquante — requise pour téléverser les fiches clients.",
    );
  }

  return createSupabaseJsClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function publicObjectUrl(bucket: string, path: string): string {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL manquante");
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${path}`;
}

export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}
