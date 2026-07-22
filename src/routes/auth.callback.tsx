import { createFileRoute, redirect } from "@tanstack/react-router";
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

        const go = (path: string) => {
          responseHeaders.set("Location", new URL(path, requestUrl.origin).toString());
          return new Response(null, { status: 302, headers: responseHeaders });
        };

        if (oauthError) return go(`/login?error=${encodeURIComponent(oauthError)}`);
        if (!code) return go("/login?error=missing_code");

        const supabase = createServerClient(supabaseUrl(), supabaseKey(), {
          cookies: {
            getAll() {
              return parseCookieHeader(request.headers.get("Cookie") ?? "");
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                responseHeaders.append(
                  "Set-Cookie",
                  serializeCookieHeader(name, value, options),
                );
              });
            },
          },
        });

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          return go(`/login?error=${encodeURIComponent(error.message)}`);
        }

        const user = data.user ?? data.session?.user;
        if (user) {
          const payload = staffFromAuthUser(user);
          // Ne crée un staff incomplet que si le cabinet est déjà connu (email signup)
          if (payload.cabinet) {
            const { syncStaffMember } = await import("@/lib/staff-sync");
            await syncStaffMember(payload);
          }
        }

        const { getCurrentSession } = await import("@/lib/session.functions");
        const { homePathForRole } = await import("@/lib/roles");
        const session = await getCurrentSession();
        if (session) return go(homePathForRole(session.staff.role));
        return go("/onboarding");
      },
    },
  },
  component: () => (
    <div className="aurora-bg flex min-h-screen items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">Connexion en cours…</p>
    </div>
  ),
});
