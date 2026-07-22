import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/common/Logo";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Mail, Lock, User, Phone, Briefcase, Eye, EyeOff } from "lucide-react";
import { signUpWithStaff, signInWithGoogle } from "@/lib/auth";
import { signupStaffSchema, toStaffPayload } from "@/lib/auth-schemas";
import { syncStaffFromSignup } from "@/lib/staff-client";
import { getCurrentSession } from "@/lib/session.functions";
import { GoogleIcon } from "@/components/auth/AuthIcons";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Inscription — 2R Expertise Fiscale" }] }),
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    jobTitle: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupStaffSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    const staff = toStaffPayload(parsed.data);
    setLoading(true);
    try {
      const { data, error } = await signUpWithStaff(
        staff.email,
        parsed.data.password,
        staff,
      );
      if (error) throw error;
      if (data.user) {
        await syncStaffFromSignup(data.user.id, staff);
      }
      toast.success("Compte créé", {
        description: data.session
          ? "Bienvenue sur 2R Expertise Fiscale"
          : "Confirmez votre email puis connectez-vous",
      });
      void navigate({ to: data.session ? "/dashboard" : "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Inscription impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 aurora-bg">
      <form onSubmit={submit} className="glass-panel w-full max-w-lg rounded-3xl p-8 shadow-float">
        <div className="mb-6">
          <Logo size="md" className="rounded-lg" />
          <div className="mt-3 text-xs text-muted-foreground">Inscription collaborateur</div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input icon={User} label="Prénom" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
          <Input icon={User} label="Nom" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
          <Input icon={Briefcase} label="Poste" value={form.jobTitle} onChange={(v) => setForm({ ...form, jobTitle: v })} className="sm:col-span-2" />
          <Input icon={Mail} label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} className="sm:col-span-2" />
          <Input icon={Phone} label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} className="sm:col-span-2" />
          <Input icon={Lock} label="Mot de passe" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          <Input icon={Lock} label="Confirmation" type="password" value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-70"
        >
          {loading ? "Création…" : <>Créer mon compte <ArrowRight className="h-4 w-4" /></>}
        </button>

        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="mt-3 inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-border/80 bg-surface px-3 py-3 text-sm font-medium transition hover:bg-muted/80"
        >
          <GoogleIcon className="h-5 w-5 shrink-0" />
          Google
        </button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}

function Input({
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-border/60 bg-transparent py-2.5 text-sm focus:border-primary focus:outline-none ${
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
