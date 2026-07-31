import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/common/Logo";
import { AuthVisualPanel } from "@/components/auth/AuthVisualPanel";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Mail, Lock, Eye, EyeOff, KeyRound, X } from "lucide-react";
import {
  requestPasswordReset,
  signInWithEmailPassword,
  signOut,
} from "@/lib/auth";
import { loginSchema, resetPasswordRequestSchema } from "@/lib/auth-schemas";
import { syncStaffToDatabase } from "@/lib/staff-client";
import { staffFromAuthUser } from "@/lib/staff-parse";
import { getCurrentSession } from "@/lib/session.functions";
import { homePathForRole } from "@/lib/roles";
import {
  checkAccountRemoved,
  getAuthBootstrap,
} from "@/lib/admin.functions";
import {
  ACCOUNT_REMOVED_HINT,
  INVITE_ONLY_LOGIN_HINT,
  isPublicSelfSignupEnabled,
} from "@/lib/access-policy";
import {
  SUGGEST_PASSWORD_CHANGE_KEY,
  userShouldSuggestPasswordChange,
} from "@/lib/auth-password";
import { humanAuthError } from "@/lib/auth-errors";
import { createClient } from "@/lib/client";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — 2R Hub" },
      {
        name: "description",
        content:
          "Connexion collaborateur à 2R Hub (2R Conseil & 2R Expertise Fiscale).",
      },
    ],
  }),
  beforeLoad: async () => {
    const boot = await getAuthBootstrap();
    if (boot?.status === "account_removed") {
      throw redirect({ to: "/compte-supprime" });
    }
    if (boot?.status === "access_denied") return;
    if (boot?.status === "needs_password") {
      throw redirect({ to: "/auth/set-password" });
    }
    if (boot?.status === "needs_onboarding") {
      throw redirect({ to: "/onboarding" });
    }
    const session = await getCurrentSession();
    if (session) throw redirect({ to: homePathForRole(session.staff.role) });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);
  const publicSignup = isPublicSelfSignupEnabled();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("error");
    if (!raw) return;
    if (raw === "account_removed") {
      void navigate({ to: "/compte-supprime" });
      return;
    }
    const message =
      raw === "invite_only"
        ? INVITE_ONLY_LOGIN_HINT
        : humanAuthError(decodeURIComponent(raw));
    toast.error(message, { duration: 10_000 });
  }, [navigate]);

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Vérifiez les champs du formulaire.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await signInWithEmailPassword(
        parsed.data.email,
        parsed.data.password,
      );
      if (error) {
        const check = await checkAccountRemoved({
          data: { email: parsed.data.email },
        });
        if (check.removed) {
          void navigate({ to: "/compte-supprime" });
          return;
        }
        throw error;
      }
      const user = data.user ?? data.session?.user;
      if (user) {
        const boot = await getAuthBootstrap();
        if (boot?.status === "account_removed") {
          void navigate({ to: "/compte-supprime" });
          return;
        }
        const payload = staffFromAuthUser(user);
        if (payload.cabinet) {
          try {
            await syncStaffToDatabase({ ...payload, id: user.id });
          } catch (syncErr) {
            if (!publicSignup) {
              await signOut();
              const msg =
                syncErr instanceof Error ? syncErr.message : INVITE_ONLY_LOGIN_HINT;
              if (msg === ACCOUNT_REMOVED_HINT) {
                void navigate({ to: "/compte-supprime" });
                return;
              }
              throw syncErr instanceof Error
                ? syncErr
                : new Error(INVITE_ONLY_LOGIN_HINT);
            }
            throw syncErr;
          }
        }
      }
      const session = await getCurrentSession();
      if (session) {
        const authUser =
          user ??
          (await createClient().auth.getUser()).data.user;
        if (userShouldSuggestPasswordChange(authUser)) {
          showFirstLoginPasswordToast(() => {
            void navigate({ to: "/profile" });
          });
          void clearSuggestPasswordChange(authUser);
        } else {
          toast.success("Connexion réussie");
        }
        void navigate({ to: homePathForRole(session.staff.role) });
      } else if (!publicSignup) {
        const boot = await getAuthBootstrap();
        if (boot?.status === "account_removed") {
          void navigate({ to: "/compte-supprime" });
          return;
        }
        const check = await checkAccountRemoved({
          data: { email: parsed.data.email },
        });
        if (check.removed) {
          void navigate({ to: "/compte-supprime" });
          return;
        }
        await signOut();
        toast.error(INVITE_ONLY_LOGIN_HINT, { duration: 10_000 });
      } else {
        void navigate({ to: "/onboarding" });
      }
    } catch (err) {
      toast.error(humanAuthError(err, "La connexion n’a pas abouti. Réessayez."));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = resetPasswordRequestSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Indiquez une adresse e-mail valide.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await requestPasswordReset(parsed.data.email);
      if (error) throw error;
      setResetSent(true);
      toast.success("E-mail envoyé", {
        description:
          "Si un compte existe pour cette adresse, vous recevrez un lien sous peu.",
        duration: 10_000,
      });
    } catch (err) {
      toast.error(
        humanAuthError(
          err,
          "Impossible d’envoyer l’e-mail pour le moment. Réessayez.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const isForgot = mode === "forgot";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthVisualPanel
        imageSrc="/optimized/auth/login-panel2.webp"
        imageAlt="Espace collaborateur 2R Hub"
        title="Deux cabinets, un seul espace de travail"
        subtitle="Reprenez vos devis, factures et dossiers clients là où vous les avez laissés."
      />

      <div className="flex items-center justify-center p-6">
        <form
          onSubmit={isForgot ? submitReset : submitLogin}
          className="glass-panel w-full max-w-md rounded-3xl p-5 shadow-float sm:p-8"
        >
          <div className="mb-6">
            <Logo size="md" className="rounded-lg" />
            <p className="mt-3 text-xs text-muted-foreground">
              Connexion collaborateur
            </p>
          </div>
          <h2 className="font-display text-2xl font-bold">
            {isForgot ? "Mot de passe oublié" : "Connexion"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isForgot
              ? "Indiquez votre e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe."
              : "Accédez à 2R Hub pour 2R Conseil ou 2R Expertise Fiscale."}
          </p>

          <div className="mt-6 space-y-4">
            <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} />
            {!isForgot ? (
              <Field
                icon={Lock}
                label="Mot de passe"
                type="password"
                value={password}
                onChange={setPassword}
              />
            ) : null}
          </div>

          {!isForgot ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setResetSent(false);
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
          ) : null}

          {isForgot && resetSent ? (
            <p className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
              Vérifiez votre boîte mail (et les indésirables). Le lien expire
              après un certain temps — vous pourrez en demander un autre si
              besoin.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {isForgot
              ? loading
                ? "Envoi…"
                : resetSent
                  ? "Renvoyer le lien"
                  : "Envoyer le lien"
              : "Se connecter"}
            <ArrowRight className="h-4 w-4" />
          </button>

          {isForgot ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setResetSent(false);
                }}
                className="font-medium text-primary hover:underline"
              >
                Retour à la connexion
              </button>
            </p>
          ) : publicSignup ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Pas de compte ?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                S&apos;inscrire
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Accès sur invitation uniquement. Contactez un administrateur 2R Hub.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

async function clearSuggestPasswordChange(user: User | null | undefined) {
  if (!user) return;
  try {
    await createClient().auth.updateUser({
      data: {
        ...(user.user_metadata ?? {}),
        [SUGGEST_PASSWORD_CHANGE_KEY]: false,
      },
    });
  } catch {
    // Le toast a déjà été montré ; on ne bloque pas la navigation.
  }
}

function showFirstLoginPasswordToast(onGoToProfile: () => void) {
  toast.custom(
    (id) => (
      <div className="pointer-events-auto w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-primary/20 bg-card text-card-foreground shadow-glow">
        <div className="h-1 w-full bg-gradient-primary" />
        <div className="relative p-4">
          <button
            type="button"
            onClick={() => toast.dismiss(id)}
            className="absolute right-2.5 top-2.5 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex gap-3 pr-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug">
                Bienvenue sur 2R Hub
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Pour votre sécurité, pensez à remplacer le mot de passe temporaire
                reçu de l’administrateur — une fois suffit.
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                toast.dismiss(id);
                onGoToProfile();
              }}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-95"
            >
              Changer mon mot de passe
            </button>
            <button
              type="button"
              onClick={() => toast.dismiss(id)}
              className="rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    ),
    { duration: 16_000, className: "!bg-transparent !border-0 !shadow-none !p-0" },
  );
}

function Field({
  icon: Icon,
  label,
  type,
  value,
  onChange,
}: {
  icon: typeof Mail;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border border-border/60 bg-surface/70 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 ${
            isPassword ? "px-10 pr-11" : "px-10"
          }`}
        />
        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
    </label>
  );
}
