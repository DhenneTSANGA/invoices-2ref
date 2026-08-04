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
  clearPasswordRecoveryPending,
  hasPasswordRecoveryPending,
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
 * - Mot de passe oublié : ?next=reset, type=recovery, localStorage, ou événement PASSWORD_RECOVERY
 *   → /auth/reset-password
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
      recovery?: boolean;
    }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        await fail("Session introuvable après validation");
        return;
      }

      if (opts.recovery) {
        // Navigation pleine page : cookies session bien pris en compte par beforeLoad
        if (!cancelled) {
          window.location.replace("/auth/reset-password");
        }
        return;
      }

      const needsPassword =
        opts.forcePassword || userMustSetPassword(user);

      if (needsPassword) {
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
      if (boot?.status === "account_removed") {
        if (!cancelled) void navigate({ to: "/compte-supprime" });
        return;
      }
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
        const nextParam = url.searchParams.get("next");
        const oauthError =
          url.searchParams.get("error_description") ??
          url.searchParams.get("error");

        if (oauthError) {
          await fail(oauthError);
          return;
        }

        let inviteFlow = typeParam === "invite";
        // `next=reset` est posé dans redirectTo du mail (fiable même sans localStorage)
        let recoveryFlow =
          typeParam === "recovery" ||
          nextParam === "reset" ||
          hasPasswordRecoveryPending();

        let recoveryFromEvent = false;
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY") recoveryFromEvent = true;
        });

        const waitForRecoveryEvent = (ms = 3500) =>
          new Promise<void>((resolve) => {
            if (recoveryFromEvent || recoveryFlow) {
              resolve();
              return;
            }
            const timeout = setTimeout(resolve, ms);
            const poll = setInterval(() => {
              if (recoveryFromEvent) {
                clearTimeout(timeout);
                clearInterval(poll);
                resolve();
              }
            }, 50);
          });

        try {
          if (code) {
            setMessage(
              recoveryFlow
                ? "Validation du lien de réinitialisation…"
                : "Échange du code d'autorisation…",
            );
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              await fail(error.message);
              return;
            }
            // PKCE : le type recovery n’est pas dans l’URL si next=reset a été perdu ;
            // on attend PASSWORD_RECOVERY en secours.
            if (!recoveryFlow) {
              await waitForRecoveryEvent();
            }
          } else if (tokenHash && typeParam) {
            setMessage(
              typeParam === "recovery"
                ? "Validation du lien de réinitialisation…"
                : typeParam === "invite"
                  ? "Validation de l'invitation…"
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
            if (typeParam === "recovery") recoveryFlow = true;
          } else if (url.hash && url.hash.includes("access_token")) {
            setMessage("Ouverture de la session…");
            const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
            const access_token = hash.get("access_token");
            const refresh_token = hash.get("refresh_token");
            const hashType = hash.get("type");
            if (hashType === "invite") inviteFlow = true;
            if (hashType === "recovery") recoveryFlow = true;
            if (!access_token || !refresh_token) {
              await fail("Lien d'authentification incomplet");
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
                recoveryFlow
                  ? "Ce lien de réinitialisation n'est plus valide. Demandez-en un nouveau depuis la page de connexion."
                  : "Lien d'invitation invalide ou expiré. Demandez une nouvelle invitation.",
              );
              return;
            }
          }
        } finally {
          subscription.unsubscribe();
        }

        recoveryFlow = recoveryFlow || recoveryFromEvent;
        if (recoveryFlow) clearPasswordRecoveryPending();

        window.history.replaceState({}, document.title, "/auth/callback");
        await goHomeOrPassword({
          forcePassword: inviteFlow && !recoveryFlow,
          recovery: recoveryFlow,
        });
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
