import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";

/**
 * Client Supabase serveur (TanStack Start).
 * Préfère SUPABASE_* puis retombe sur VITE_* (même projet).
 */
export function createClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Variables SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY (ou VITE_*) manquantes.",
    );
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(name, value, options);
          });
        } catch {
          // Peut échouer hors d’un contexte requête (build / prerender).
        }
      },
    },
  });
}
