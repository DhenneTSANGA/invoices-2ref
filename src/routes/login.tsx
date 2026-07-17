import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AuthDivider,
  AuthShell,
  FloatField,
  SocialAuthButtons,
} from "@/components/auth/AuthShell";
import {
  authErrorMessage,
  signInWithEmailMagicLink,
  signInWithEmailPassword,
  signInWithGoogle,
} from "@/lib/auth";
import { loginSchema } from "@/lib/auth-schemas";
import { syncStaffToDatabase } from "@/lib/staff-client";
import { staffFromAuthUser } from "@/lib/staff-parse";

type LoginSearch = { error?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Connexion — 2REF" },
      {
        name: "description",
        content: "Connectez-vous à votre espace 2REF Expertise Fiscale.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { error: searchError } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    if (searchError) {
      toast.error(authErrorMessage({ message: decodeURIComponent(searchError) }));
    }
  }, [searchError]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signInWithEmailPassword(
        parsed.data.email,
        parsed.data.password,
      );
      if (error) {
        toast.error(authErrorMessage(error));
        return;
      }

      const user = data.user;
      if (user) {
        const payload = staffFromAuthUser(user);
        if (payload) {
          try {
            await syncStaffToDatabase(payload);
          } catch (err) {
            console.error(err);
            toast.warning(
              "Connecté, mais le profil n’a pas pu être synchronisé en base.",
            );
          }
        }
      }

      toast.success("Connexion réussie");
      void navigate({ to: "/dashboard" });
    } catch {
      toast.error("Impossible de se connecter. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setOauthLoading(true);
    try {
      const { data, error } = await signInWithGoogle();
      if (error) {
        toast.error(authErrorMessage(error));
        setOauthLoading(false);
        return;
      }
      if (data.url) window.location.assign(data.url);
    } catch {
      toast.error("Connexion Google indisponible.");
      setOauthLoading(false);
    }
  };

  const handleEmailMagic = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.message("Indiquez votre email");
      return;
    }
    setOauthLoading(true);
    try {
      const { error } = await signInWithEmailMagicLink(trimmed);
      if (error) {
        toast.error(authErrorMessage(error));
        return;
      }
      toast.success("Lien envoyé", { description: `Vérifiez ${trimmed}` });
    } catch {
      toast.error("Impossible d’envoyer le lien email.");
    } finally {
      setOauthLoading(false);
    }
  };

  const busy = loading || oauthLoading;

  return (
    <AuthShell
      title="Bon retour"
      subtitle="Espace collaborateur — 2REF Expertise Fiscale"
    >
      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
        <FloatField
          icon={Mail}
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
          placeholder="prenom@2ref.ga"
        />
        <FloatField
          icon={Lock}
          label="Mot de passe"
          type="password"
          name="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-border"
            />
            <span>Se souvenir de moi</span>
          </label>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              if (!email.trim()) {
                toast.message("Saisissez votre email d’abord.");
                return;
              }
              void handleEmailMagic();
            }}
          >
            Mot de passe oublié ?
          </button>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
        >
          {loading ? (
            "Connexion…"
          ) : (
            <>
              Se connecter <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <AuthDivider label="connexion rapide" />
        <SocialAuthButtons
          loading={busy}
          onGoogle={() => void handleGoogle()}
          onEmail={() => void handleEmailMagic()}
        />
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Nouveau collaborateur ?{" "}
        <Link
          to="/signup"
          className="font-medium text-primary hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </AuthShell>
  );
}
