import { createFileRoute } from "@tanstack/react-router";
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";

import { staffFromAuthUser } from "@/lib/staff-parse";

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

/**
 * Callback OAuth / magic link — échange PKCE côté serveur
 * + synchronisation dans `staff_members`.
 */
export const Route = createFileRoute("/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const code = requestUrl.searchParams.get("code");
        const oauthError =
          requestUrl.searchParams.get("error_description") ??
          requestUrl.searchParams.get("error");

        const responseHeaders = new Headers();

        const redirect = (path: string) => {
          const target = new URL(path, requestUrl.origin);
          responseHeaders.set("Location", target.toString());
          return new Response(null, { status: 302, headers: responseHeaders });
        };

        if (oauthError) {
          return redirect(`/login?error=${encodeURIComponent(oauthError)}`);
        }

        if (!code) {
          return redirect("/login?error=missing_code");
        }

        const supabase = createServerClient(supabaseUrl(), supabaseKey(), {
          cookies: {
            getAll() {
              return parseCookieHeader(request.headers.get("Cookie") ?? "");
            },
            setAll(cookiesToSet, cacheHeaders) {
              cookiesToSet.forEach(({ name, value, options }) => {
                responseHeaders.append(
                  "Set-Cookie",
                  serializeCookieHeader(name, value, options),
                );
              });
              Object.entries(cacheHeaders).forEach(([key, value]) => {
                responseHeaders.set(key, value);
              });
            },
          },
        });

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("[auth/callback]", error.message);
          return redirect(
            `/login?error=${encodeURIComponent(error.message)}`,
          );
        }

        const user = data.user ?? data.session?.user;
        const payload = user ? staffFromAuthUser(user) : null;
        if (payload) {
          try {
            const { syncStaffMember } = await import("@/lib/staff-sync");
            await syncStaffMember(payload);
          } catch (err) {
            console.error("[auth/callback] staff upsert", err);
          }
        }

        return redirect("/dashboard");
      },
    },
  },
  component: AuthCallbackFallback,
});

function AuthCallbackFallback() {
  return (
    <div className="aurora-bg flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel max-w-sm rounded-3xl px-8 py-10 text-center shadow-float">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary font-display text-lg font-bold text-primary-foreground shadow-glow">
          2
        </div>
        <p className="text-sm font-medium">Finalisation de la connexion…</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Redirection en cours.
        </p>
      </div>
    </div>
  );
}
