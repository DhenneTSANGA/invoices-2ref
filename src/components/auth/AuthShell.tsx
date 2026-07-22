import { motion } from "framer-motion";
import { Eye, EyeOff, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";

import { EmailBrandIcon, GoogleIcon } from "./AuthIcons";

const features = [
  { icon: Sparkles, t: "Aperçu temps réel pixel-perfect" },
  { icon: FileText, t: "4 modèles professionnels Excel-like" },
  { icon: ShieldCheck, t: "Sécurité de niveau entreprise" },
];

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="aurora-bg relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 20% 40%, oklch(0.62 0.18 258 / 0.35), transparent), radial-gradient(ellipse 60% 40% at 80% 70%, oklch(0.78 0.16 75 / 0.2), transparent)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary font-display text-xl font-bold text-primary-foreground shadow-glow">
            2
          </div>
          <div>
            <div className="font-display text-xl font-bold">2R</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Expertise Fiscale
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display text-5xl font-bold leading-tight tracking-tight"
          >
            Gérez vos clients, devis et factures avec{" "}
            <span className="text-gradient-primary">élégance</span>.
          </motion.h1>
          <p className="max-w-md text-muted-foreground">
            Une plateforme premium pensée pour les cabinets d&apos;expertise
            comptable et fiscale du Gabon et de la zone CEMAC.
          </p>

          <div className="grid max-w-md gap-3">
            {features.map((f, i) => (
              <motion.div
                key={f.t}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="glass-subtle flex items-center gap-3 rounded-2xl px-4 py-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                  <f.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{f.t}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} FacturIA. Tous droits réservés.
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-panel w-full max-w-lg rounded-3xl p-8 shadow-float"
        >
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary font-bold text-primary-foreground">
              2
            </div>
            <span className="font-display text-lg font-bold">2R</span>
          </div>
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

export function AuthDivider({ label = "ou" }: { label?: string }) {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border/70" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wider">
        <span className="bg-card px-3 text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export function FloatField({
  icon: Icon,
  label,
  type,
  name,
  value,
  onChange,
  autoComplete,
  required,
  placeholder,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  type: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <label className="group block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={inputType}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          className={`w-full rounded-2xl border border-border/60 bg-surface/70 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 ${
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
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>
    </label>
  );
}

export function SocialAuthButtons({
  onGoogle,
  onEmail,
  loading,
}: {
  onGoogle: () => void;
  onEmail: () => void;
  loading?: boolean;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <button
        type="button"
        disabled={loading}
        onClick={onGoogle}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-border/80 bg-surface px-3 py-3 text-sm font-medium transition hover:bg-muted/80 disabled:opacity-60"
      >
        <GoogleIcon className="h-5 w-5 shrink-0" />
        Google
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onEmail}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-border/80 bg-surface px-3 py-3 text-sm font-medium transition hover:bg-muted/80 disabled:opacity-60"
      >
        <EmailBrandIcon className="h-5 w-5 shrink-0" />
        Email
      </button>
    </div>
  );
}
