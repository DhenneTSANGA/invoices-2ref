import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import { createMiddleware } from "@tanstack/react-start";

/**
 * Middleware optionnel pour rafraîchir la session Supabase sur chaque requête.
 * Brancher dans src/start.ts si l’auth SSR est activée.
 */
export const supabaseSessionMiddleware = createMiddleware().server(
  async ({ next }) => {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const key =
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (url && key) {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return Object.entries(getCookies()).map(([name, value]) => ({
              name,
              value: value ?? "",
            }));
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              setCookie(name, value, options);
            });
          },
        },
      });

      // Rafraîchit les tokens si nécessaire (ne pas retirer)
      await supabase.auth.getUser();
    }

    return next();
  },
);
