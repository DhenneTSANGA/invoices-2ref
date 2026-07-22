import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { DualCabinetLogos } from "@/components/common/Logo";
import { AuthVisualPanel } from "@/components/auth/AuthVisualPanel";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  Building2,
  Briefcase,
} from "lucide-react";
import { signUpWithStaff, signInWithGoogle } from "@/lib/auth";
import { signupStaffSchema, toStaffPayload } from "@/lib/auth-schemas";
import { syncStaffFromSignup } from "@/lib/staff-client";
import { getCurrentSession } from "@/lib/session.functions";
import { GoogleIcon } from "@/components/auth/AuthIcons";
import { CABINET_LABELS, STAFF_JOB_TITLES } from "@/lib/cabinets";
import { homePathForRole } from "@/lib/roles";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Inscription — 2R" }] }),
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (session) throw redirect({ to: homePathForRole(session.staff.role) });
  },
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    jobTitle: "" as string,
    cabinet: "" as string,
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cabinet) {
      toast.error("Choisissez votre cabinet");
      return;
    }
    if (!form.jobTitle) {
      toast.error("Choisissez votre poste");
      return;
    }
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
          ? "Bienvenue"
          : "Confirmez votre email puis connectez-vous",
      });
      void navigate({ to: data.session ? "/home" : "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Inscription impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthVisualPanel
        imageSrc="/auth/signup2.png"
        imageAlt="Bienvenue chez 2R Conseil et 2R Expertise Fiscale"
        title="Bienvenue dans l’équipe 2R"
        subtitle="Choisissez votre cabinet et votre poste pour démarrer — documents, clients et collaboration au même endroit."
      />

      <div className="flex items-center justify-center p-6">
        <form
          onSubmit={submit}
          className="glass-panel w-full max-w-lg rounded-3xl p-5 shadow-float sm:p-8"
        >
          <div className="mb-6">
            <DualCabinetLogos size="sm" className="gap-2.5 [&_img]:h-10" />
            <div className="mt-3 text-xs text-muted-foreground">
              Inscription collaborateur
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              icon={User}
              label="Prénom"
              value={form.firstName}
              onChange={(v) => setForm({ ...form, firstName: v })}
            />
            <Input
              icon={User}
              label="Nom"
              value={form.lastName}
              onChange={(v) => setForm({ ...form, lastName: v })}
            />
            <Select
              icon={Building2}
              label="Cabinet"
              value={form.cabinet}
              onChange={(v) => setForm({ ...form, cabinet: v })}
              className="sm:col-span-2"
              required
              options={[
                { value: "conseil", label: CABINET_LABELS.conseil },
                {
                  value: "expertise_fiscale",
                  label: CABINET_LABELS.expertise_fiscale,
                },
              ]}
            />
            <Select
              icon={Briefcase}
              label="Poste"
              value={form.jobTitle}
              onChange={(v) => setForm({ ...form, jobTitle: v })}
              className="sm:col-span-2"
              required
              options={STAFF_JOB_TITLES.map((j) => ({
                value: j.value,
                label: j.label,
              }))}
            />
            <Input
              icon={Mail}
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              className="sm:col-span-2"
            />
            <Input
              icon={Phone}
              label="Téléphone"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              className="sm:col-span-2"
            />
            <Input
              icon={Lock}
              label="Mot de passe"
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
            />
            <Input
              icon={Lock}
              label="Confirmation"
              type="password"
              value={form.confirmPassword}
              onChange={(v) => setForm({ ...form, confirmPassword: v })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-70"
          >
            {loading ? (
              "Création…"
            ) : (
              <>
                Créer mon compte <ArrowRight className="h-4 w-4" />
              </>
            )}
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
            <Link to="/login" className="font-medium text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Select({
  icon: Icon,
  label,
  value,
  onChange,
  options,
  className = "",
  required = false,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-border/60 bg-transparent py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
        >
          <option value="" disabled>
            Choisir…
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </label>
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
