import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY requis");
  }
  return createBrowserClient(url, key, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
    },
  });
}
