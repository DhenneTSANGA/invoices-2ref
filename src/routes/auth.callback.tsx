import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/client";
import { staffFromAuthUser } from "@/lib/staff-parse";
import { LoadingState } from "@/components/common/LoadingState";
import {
  INVITE_ONLY_LOGIN_HINT,
  isPublicSelfSignupEnabled,
} from "@/lib/access-policy";
import {
  MUST_SET_PASSWORD_KEY,
  userMustSetPassword,
} from "@/lib/auth-password";
import { getAuthBootstrap } from "@/lib/admin.functions";
import { getCurrentSession } from "@/lib/session.functions";
import { homePathForRole } from "@/lib/roles";
import { syncStaffToDatabase } from "@/lib/staff-client";
import { humanAuthError } from "@/lib/auth-errors";

/**
 * Callback Auth unique :
 * - OAuth / PKCE : ?code=
 * - Invitation / e-mail (templates TokenHash) : ?token_hash=&type=
 * - Ancien flux implicite : #access_token=&refresh_token=
 *
 * Après invitation → /auth/set-password pour créer le mot de passe.
 */
export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Connexion — 2R Hub" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finalisation de votre session sécurisée…");

  useEffect(() => {
    let cancelled = false;

    const fail = async (reason: string) => {
      try {
        await createClient().auth.signOut();
      } catch {
        // ignore
      }
      if (!cancelled) {
        window.location.replace(
          `/login?error=${encodeURIComponent(humanAuthError(reason))}`,
        );
      }
    };

    const goHomeOrPassword = async (opts: {
      forcePassword?: boolean;
    }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        await fail("Session introuvable après validation");
        return;
      }

      const needsPassword =
        opts.forcePassword || userMustSetPassword(user);

      if (needsPassword) {
        // Garantit le flag même si l’invitation date d’avant cette feature
        if (!userMustSetPassword(user)) {
          await supabase.auth.updateUser({
            data: {
              ...(user.user_metadata ?? {}),
              [MUST_SET_PASSWORD_KEY]: true,
            },
          });
        }
        if (!cancelled) void navigate({ to: "/auth/set-password" });
        return;
      }

      const boot = await getAuthBootstrap();
      if (boot?.status === "access_denied") {
        await fail(boot.message ?? INVITE_ONLY_LOGIN_HINT);
        return;
      }
      if (boot?.status === "needs_password") {
        if (!cancelled) void navigate({ to: "/auth/set-password" });
        return;
      }
      if (boot?.status === "ready") {
        if (!cancelled) {
          void navigate({ to: homePathForRole(boot.staff.role) });
        }
        return;
      }

      if (isPublicSelfSignupEnabled()) {
        const payload = staffFromAuthUser(user);
        if (payload.cabinet) {
          try {
            await syncStaffToDatabase({ ...payload, id: user.id });
          } catch {
            // onboarding complétera
          }
        }
        const session = await getCurrentSession();
        if (session) {
          if (!cancelled) {
            void navigate({ to: homePathForRole(session.staff.role) });
          }
          return;
        }
        if (!cancelled) void navigate({ to: "/onboarding" });
        return;
      }

      const session = await getCurrentSession();
      if (session) {
        if (!cancelled) {
          void navigate({ to: homePathForRole(session.staff.role) });
        }
        return;
      }

      await fail(INVITE_ONLY_LOGIN_HINT);
    };

    const run = async () => {
      try {
        const supabase = createClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const typeParam = url.searchParams.get("type");
        const oauthError =
          url.searchParams.get("error_description") ??
          url.searchParams.get("error");

        if (oauthError) {
          await fail(oauthError);
          return;
        }

        let inviteFlow = typeParam === "invite";

        if (code) {
          setMessage("Échange du code d’autorisation…");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            await fail(error.message);
            return;
          }
        } else if (tokenHash && typeParam) {
          setMessage(
            typeParam === "invite"
              ? "Validation de l’invitation…"
              : "Validation du lien…",
          );
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: typeParam as EmailOtpType,
          });
          if (error) {
            await fail(error.message);
            return;
          }
          inviteFlow = typeParam === "invite";
        } else if (url.hash && url.hash.includes("access_token")) {
          setMessage("Ouverture de la session…");
          const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
          const access_token = hash.get("access_token");
          const refresh_token = hash.get("refresh_token");
          if (hash.get("type") === "invite") inviteFlow = true;
          if (!access_token || !refresh_token) {
            await fail("Lien d’invitation incomplet");
            return;
          }
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            await fail(error.message);
            return;
          }
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            await fail(
              "Lien d’invitation invalide ou expiré. Demandez une nouvelle invitation.",
            );
            return;
          }
        }

        window.history.replaceState({}, document.title, "/auth/callback");
        await goHomeOrPassword({ forcePassword: inviteFlow });
      } catch (err) {
        await fail(
          err instanceof Error
            ? err.message
            : "Impossible de finaliser la connexion",
        );
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="aurora-bg flex min-h-screen items-center justify-center p-6">
      <LoadingState
        className="max-w-sm shadow-float"
        title="Connexion en cours"
        description={message}
      />
    </div>
  );
}
