import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { createClient } from "@/lib/client";
import { resetPasswordSchema } from "@/lib/auth-schemas";
import {
  MUST_SET_PASSWORD_KEY,
  SUGGEST_PASSWORD_CHANGE_KEY,
} from "@/lib/auth-password";
import { getAuthBootstrap } from "@/lib/admin.functions";
import { homePathForRole } from "@/lib/roles";
import { getCurrentSession } from "@/lib/session.functions";
import { humanAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [{ title: "Nouveau mot de passe — 2R Hub" }],
  }),
  beforeLoad: async () => {
    // Pendant un recovery, on ne bloque pas sur access_denied / onboarding :
    // l’utilisateur doit pouvoir changer son mot de passe dès qu’une session Auth existe.
    const boot = await getAuthBootstrap();
    if (!boot) throw redirect({ to: "/login" });
    if (boot.status === "account_removed") {
      throw redirect({ to: "/compte-supprime" });
    }
  },
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        throw new Error(
          "Session expirée. Rouvrez le lien reçu par e-mail, ou demandez-en un nouveau.",
        );
      }

      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
        data: {
          ...(userData.user.user_metadata ?? {}),
          [MUST_SET_PASSWORD_KEY]: false,
          [SUGGEST_PASSWORD_CHANGE_KEY]: false,
        },
      });
      if (error) throw error;

      toast.success("Mot de passe mis à jour", {
        description: "Vous pouvez vous connecter avec votre nouveau mot de passe.",
      });

      const session = await getCurrentSession();
      if (session) {
        void navigate({ to: homePathForRole(session.staff.role) });
        return;
      }
      void navigate({ to: "/login" });
    } catch (err) {
      toast.error(
        humanAuthError(
          err,
          "Impossible d’enregistrer le nouveau mot de passe pour le moment.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aurora-bg flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="glass-panel w-full max-w-md rounded-3xl p-5 shadow-float sm:p-8"
      >
        <Logo size="md" className="rounded-lg" />
        <h1 className="font-display mt-6 text-2xl font-bold">
          Nouveau mot de passe
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choisissez un mot de passe pour retrouver l’accès à votre compte 2R Hub.
        </p>

        <div className="mt-6 space-y-4">
          <PasswordField
            label="Nouveau mot de passe"
            value={password}
            onChange={setPassword}
            show={show}
            onToggleShow={() => setShow((v) => !v)}
          />
          <PasswordField
            label="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={show}
            onToggleShow={() => setShow((v) => !v)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </form>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          className="w-full rounded-2xl border border-border/60 bg-surface/70 py-3 pl-10 pr-11 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={show ? "Masquer" : "Afficher"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
