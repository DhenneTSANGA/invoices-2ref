import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase navigateur (Vite / TanStack Start).
 * PKCE stocké en cookies via @supabase/ssr.
 * detectSessionInUrl: false — l’échange du code se fait sur /auth/callback (serveur).
 */
export function createClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Variables VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY manquantes.",
    );
  }

  return createBrowserClient(url, key, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
    },
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
