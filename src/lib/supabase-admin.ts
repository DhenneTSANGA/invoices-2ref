import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

export { appPublicUrl, absoluteAppUrl } from "@/lib/app-url";

/** Client Auth Admin (service role) — invites, suppressions, etc. */
export function createAuthAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SECRET_KEY manquante — requise pour inviter des collaborateurs.",
    );
  }

  return createSupabaseJsClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
