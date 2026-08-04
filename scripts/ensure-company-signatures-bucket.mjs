/**
 * Crée le bucket public des signatures gérants.
 *   pnpm exec node scripts/ensure-company-signatures-bucket.mjs
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SECRET_KEY manquants");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const bucket = "company-signatures";
const { data: existing, error: listErr } = await supabase.storage.listBuckets();
if (listErr) {
  console.error("listBuckets:", listErr.message);
  process.exit(1);
}

if (existing?.some((b) => b.name === bucket)) {
  console.log(`Bucket « ${bucket} » déjà présent.`);
  process.exit(0);
}

const { error } = await supabase.storage.createBucket(bucket, {
  public: true,
  fileSizeLimit: 2 * 1024 * 1024,
  allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
});

if (error) {
  console.error("createBucket:", error.message);
  process.exit(1);
}

console.log(`Bucket « ${bucket} » créé (public).`);
