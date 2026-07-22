import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { DualCabinetLogos } from "@/components/common/Logo";
import { AuthVisualPanel } from "@/components/auth/AuthVisualPanel";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { signInWithEmailPassword, signInWithGoogle } from "@/lib/auth";
import { loginSchema } from "@/lib/auth-schemas";
import { syncStaffToDatabase } from "@/lib/staff-client";
import { staffFromAuthUser } from "@/lib/staff-parse";
import { getCurrentSession } from "@/lib/session.functions";
import { GoogleIcon } from "@/components/auth/AuthIcons";
import { homePathForRole } from "@/lib/roles";
import { getAuthBootstrap } from "@/lib/admin.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — 2R" },
      {
        name: "description",
        content:
          "Accédez à votre espace collaborateur 2R Conseil ou 2R Expertise Fiscale.",
      },
    ],
  }),
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (session) throw redirect({ to: homePathForRole(session.staff.role) });
    const boot = await getAuthBootstrap();
    if (boot?.status === "needs_onboarding") {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
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
      if (error) throw error;
      const user = data.user ?? data.session?.user;
      if (user) {
        const payload = staffFromAuthUser(user);
        if (payload.cabinet) {
          await syncStaffToDatabase({ ...payload, id: user.id });
        }
      }
      const session = await getCurrentSession();
      if (session) {
        toast.success("Connexion réussie");
        void navigate({ to: homePathForRole(session.staff.role) });
      } else {
        void navigate({ to: "/onboarding" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthVisualPanel
        imageSrc="/auth/login-panel2.png"
        imageAlt="Bureaux 2R Conseil et 2R Expertise Fiscale"
        title="Deux cabinets, un seul espace de travail"
        subtitle="Reprenez vos devis, factures et dossiers clients là où vous les avez laissés."
      />

      <div className="flex items-center justify-center p-6">
        <form
          onSubmit={submit}
          className="glass-panel w-full max-w-md rounded-3xl p-5 shadow-float sm:p-8"
        >
          <div className="mb-6">
            <DualCabinetLogos size="sm" className="gap-2.5 [&_img]:h-10" />
            <p className="mt-3 text-xs text-muted-foreground">
              Connexion collaborateur
            </p>
          </div>
          <h2 className="font-display text-2xl font-bold">Connexion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Accédez à votre espace pour 2R Conseil ou 2R Expertise Fiscale.
          </p>

          <div className="mt-6 space-y-4">
            <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} />
            <Field
              icon={Lock}
              label="Mot de passe"
              type="password"
              value={password}
              onChange={setPassword}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-70"
          >
            {loading ? (
              "Connexion…"
            ) : (
              <>
                Se connecter <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={google}
            disabled={loading}
            className="mt-3 inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-border/80 bg-surface px-3 py-3 text-sm font-medium transition hover:bg-muted/80 disabled:opacity-60"
          >
            <GoogleIcon className="h-5 w-5 shrink-0" />
            Continuer avec Google
          </button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Pas de compte ?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              S&apos;inscrire
            </Link>
          </p>
        </form>
      </div>
    </div>
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
