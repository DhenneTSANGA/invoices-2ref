import { createMiddleware } from "@tanstack/react-start";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";

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

function formatSetCookie(
  name: string,
  value: string,
  options: {
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string | boolean;
    maxAge?: number;
    expires?: Date;
  },
) {
  const parts = [`${name}=${value}`, `Path=${options.path ?? "/"}`];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  const sameSite =
    options.sameSite === true
      ? "Strict"
      : options.sameSite === false
        ? "Lax"
        : options.sameSite ?? "Lax";
  parts.push(`SameSite=${sameSite}`);
  return parts.join("; ");
}

/**
 * Rafraîchit les cookies de session sans bloquer le rendu.
 * getSession() lit le JWT localement (rapide) — pas d'appel réseau Auth.
 */
export const supabaseSessionMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const pendingCookies: Array<{
      name: string;
      value: string;
      options: Parameters<typeof formatSetCookie>[2];
    }> = [];

    const supabase = createServerClient(supabaseUrl(), supabaseKey(), {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet);
        },
      },
    });

    const [result] = await Promise.all([next(), supabase.auth.getSession()]);

    if (pendingCookies.length === 0 || !(result instanceof Response)) {
      return result;
    }

    const headers = new Headers(result.headers);
    for (const { name, value, options } of pendingCookies) {
      headers.append("Set-Cookie", formatSetCookie(name, value, options));
    }

    const body = await result.text();
    return new Response(body, {
      status: result.status,
      statusText: result.statusText,
      headers,
    });
  },
);
