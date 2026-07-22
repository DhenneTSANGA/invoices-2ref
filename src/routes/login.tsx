import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/common/Logo";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Mail, Lock, Eye, EyeOff } from "lucide-react";
import {
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithEmailMagicLink,
} from "@/lib/auth";
import { loginSchema } from "@/lib/auth-schemas";
import { syncStaffToDatabase } from "@/lib/staff-client";
import { staffFromAuthUser } from "@/lib/staff-parse";
import { getCurrentSession } from "@/lib/session.functions";
import { EmailBrandIcon, GoogleIcon } from "@/components/auth/AuthIcons";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — 2R Expertise Fiscale" },
      { name: "description", content: "Accédez à votre espace 2R Expertise Fiscale." },
    ],
  }),
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (session) throw redirect({ to: "/dashboard" });
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
        await syncStaffToDatabase({ ...payload, id: user.id });
      }
      toast.success("Connexion réussie");
      void navigate({ to: "/dashboard" });
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

  const magic = async () => {
    if (!email) {
      toast.error("Saisissez votre email");
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmailMagicLink(email);
    if (error) toast.error(error.message);
    else toast.success("Lien magique envoyé — consultez votre boîte mail");
    setLoading(false);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="aurora-bg relative hidden flex-col justify-between p-12 lg:flex">
        <Brand />
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight">
            2R Expertise Fiscale
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Plateforme d&apos;automatisation du cabinet 2R Expertise Fiscale.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} 2R Expertise Fiscale
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-float">
          <div className="lg:hidden mb-6">
            <Brand />
          </div>
          <h2 className="font-display text-2xl font-bold">Connexion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Accédez à votre espace collaborateur.
          </p>

          <div className="mt-6 space-y-4">
            <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} />
            <Field icon={Lock} label="Mot de passe" type="password" value={password} onChange={setPassword} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-70"
          >
            {loading ? "Connexion…" : <>Se connecter <ArrowRight className="h-4 w-4" /></>}
          </button>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={google}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-border/80 bg-surface px-3 py-3 text-sm font-medium transition hover:bg-muted/80 disabled:opacity-60"
            >
              <GoogleIcon className="h-5 w-5 shrink-0" />
              Google
            </button>
            <button
              type="button"
              onClick={magic}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-border/80 bg-surface px-3 py-3 text-sm font-medium transition hover:bg-muted/80 disabled:opacity-60"
            >
              <EmailBrandIcon className="h-5 w-5 shrink-0" />
              Email
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Pas de compte ?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              S&apos;inscrire
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Brand() {
  return <Logo size="md" className="rounded-lg" />;
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
