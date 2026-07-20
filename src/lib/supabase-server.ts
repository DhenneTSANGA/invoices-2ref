import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { getRequest } from "@tanstack/react-start/server";

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
}

function supabaseKey() {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    ""
  );
}

/** Client Supabase SSR lié à la requête courante (server functions / handlers). */
export function createSupabaseServer() {
  const request = getRequest();
  const cookieHeader = request.headers.get("Cookie") ?? "";

  return createServerClient(supabaseUrl(), supabaseKey(), {
    cookies: {
      getAll() {
        return parseCookieHeader(cookieHeader);
      },
      setAll() {
        // Les server functions en lecture seule n'ont pas besoin de Set-Cookie.
      },
    },
  });
}
