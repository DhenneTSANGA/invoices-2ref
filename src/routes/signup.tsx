import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Briefcase, Lock, Mail, Phone, User } from "lucide-react";
import { useState } from "react";
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
  signInWithGoogle,
  signUpWithStaff,
} from "@/lib/auth";
import { signupStaffSchema, toStaffPayload } from "@/lib/auth-schemas";
import { syncStaffFromSignup } from "@/lib/staff-client";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Inscription — 2REF" },
      {
        name: "description",
        content: "Créez votre compte collaborateur 2REF Expertise Fiscale.",
      },
    ],
  }),
  component: SignupPage,
});

const emptyForm = {
  firstName: "",
  lastName: "",
  jobTitle: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const set =
    (key: keyof typeof emptyForm) =>
    (value: string) =>
      setForm((f) => ({ ...f, [key]: value }));

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
      if (error) {
        toast.error(authErrorMessage(error));
        return;
      }

      if (!data.user?.id) {
        toast.error("Compte Auth créé sans identifiant utilisateur.");
        return;
      }

      // Toujours écrire dans staff_members (même sans session / email à confirmer)
      try {
        await syncStaffFromSignup(data.user.id, staff);
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Compte Auth OK, mais profil non enregistré en base.",
        );
        return;
      }

      if (data.session) {
        toast.success("Bienvenue chez 2REF");
        void navigate({ to: "/dashboard" });
        return;
      }

      toast.success("Compte enregistré", {
        description:
          "Confirmez votre email si demandé, puis connectez-vous. Votre profil est déjà en base.",
      });
      void navigate({ to: "/login" });
    } catch {
      toast.error("Impossible de créer le compte. Réessayez.");
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
      toast.error("Inscription Google indisponible.");
      setOauthLoading(false);
    }
  };

  const handleEmailMagic = async () => {
    const trimmed = form.email.trim();
    if (!trimmed) {
      toast.message("Indiquez votre email professionnel");
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
      title="Rejoindre l’équipe"
      subtitle="Compte collaborateur — 2REF Expertise Fiscale"
    >
      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FloatField
            icon={User}
            label="Prénom"
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={set("firstName")}
            autoComplete="given-name"
            required
            placeholder="Mireille"
          />
          <FloatField
            icon={User}
            label="Nom"
            type="text"
            name="lastName"
            value={form.lastName}
            onChange={set("lastName")}
            autoComplete="family-name"
            required
            placeholder="Nguema"
          />
        </div>
        <FloatField
          icon={Briefcase}
          label="Poste"
          type="text"
          name="jobTitle"
          value={form.jobTitle}
          onChange={set("jobTitle")}
          autoComplete="organization-title"
          required
          placeholder="Expert-comptable, Assistante…"
        />
        <FloatField
          icon={Mail}
          label="Email professionnel"
          type="email"
          name="email"
          value={form.email}
          onChange={set("email")}
          autoComplete="email"
          required
          placeholder="prenom@2ref.ga"
        />
        <FloatField
          icon={Phone}
          label="Téléphone"
          type="tel"
          name="phone"
          value={form.phone}
          onChange={set("phone")}
          autoComplete="tel"
          required
          placeholder="+241 07 00 00 00"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FloatField
            icon={Lock}
            label="Mot de passe"
            type="password"
            name="password"
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
            required
            placeholder="Au moins 6 caractères"
          />
          <FloatField
            icon={Lock}
            label="Confirmer"
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            autoComplete="new-password"
            required
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
        >
          {loading ? (
            "Création…"
          ) : (
            <>
              Créer mon compte <ArrowRight className="h-4 w-4" />
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
        Déjà un compte ?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthShell>
  );
}
