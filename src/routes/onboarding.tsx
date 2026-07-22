import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Building2, Briefcase, Phone, User } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import {
  completeOnboarding,
  getAuthBootstrap,
} from "@/lib/admin.functions";
import { onboardingSchema } from "@/lib/auth-schemas";
import { CABINET_LABELS, STAFF_JOB_TITLES } from "@/lib/cabinets";
import { homePathForRole } from "@/lib/roles";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Finaliser le profil — 2R" }] }),
  beforeLoad: async () => {
    const boot = await getAuthBootstrap();
    if (!boot) throw redirect({ to: "/login" });
    if (boot.status === "ready") {
      throw redirect({ to: homePathForRole(boot.staff.role) });
    }
  },
  loader: async () => {
    const boot = await getAuthBootstrap();
    if (!boot || boot.status !== "needs_onboarding") {
      throw redirect({ to: "/login" });
    }
    return { boot };
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const { boot } = Route.useLoaderData();
  const navigate = useNavigate();
  const suggested = boot.suggested;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: suggested?.firstName ?? "",
    lastName: suggested?.lastName ?? "",
    jobTitle: "",
    cabinet: "",
    phone: suggested?.phone ?? "",
  });

  useEffect(() => {
    if (!suggested) return;
    setForm((f) => ({
      ...f,
      firstName: suggested.firstName || f.firstName,
      lastName: suggested.lastName || f.lastName,
      phone: suggested.phone || f.phone,
      cabinet: suggested.cabinet || f.cabinet,
      jobTitle: suggested.jobTitle || f.jobTitle,
    }));
  }, [suggested]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = onboardingSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setLoading(true);
    try {
      const staff = await completeOnboarding({ data: parsed.data });
      toast.success("Profil complété");
      void navigate({ to: homePathForRole(staff.role) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de continuer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 aurora-bg">
      <form
        onSubmit={submit}
        className="glass-panel w-full max-w-lg rounded-3xl p-5 shadow-float sm:p-8"
      >
        <Logo size="md" className="rounded-lg" />
        <h1 className="mt-4 font-display text-xl font-bold">Finaliser votre profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisissez votre cabinet et votre fonction pour accéder à l’espace.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field
            icon={User}
            label="Prénom"
            value={form.firstName}
            onChange={(v) => setForm({ ...form, firstName: v })}
          />
          <Field
            icon={User}
            label="Nom"
            value={form.lastName}
            onChange={(v) => setForm({ ...form, lastName: v })}
          />
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Cabinet
            </span>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                required
                value={form.cabinet}
                onChange={(e) => setForm({ ...form, cabinet: e.target.value })}
                className="w-full appearance-none rounded-xl border border-border/60 bg-background py-2.5 pl-10 pr-3 text-sm"
              >
                <option value="" disabled>
                  Choisir un cabinet…
                </option>
                <option value="conseil">{CABINET_LABELS.conseil}</option>
                <option value="expertise_fiscale">
                  {CABINET_LABELS.expertise_fiscale}
                </option>
              </select>
            </div>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Fonction
            </span>
            <div className="relative">
              <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                required
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                className="w-full appearance-none rounded-xl border border-border/60 bg-background py-2.5 pl-10 pr-3 text-sm"
              >
                <option value="" disabled>
                  Choisir une fonction…
                </option>
                {STAFF_JOB_TITLES.map((j) => (
                  <option key={j.value} value={j.value}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <Field
            icon={Phone}
            label="Téléphone"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
            className="sm:col-span-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-70"
        >
          {loading ? "Enregistrement…" : <>Continuer <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  className = "",
}: {
  icon: typeof User;
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border/60 bg-transparent py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
        />
      </div>
    </label>
  );
}
