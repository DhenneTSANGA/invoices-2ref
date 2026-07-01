import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Lock, ShieldCheck, Sparkles, FileText } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — FacturIA" }, { name: "description", content: "Accédez à votre espace FacturIA." }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate({ to: "/dashboard" }), 700);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="aurora-bg relative hidden flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground font-display text-xl font-bold shadow-glow">F</div>
          <div>
            <div className="font-display text-xl font-bold">FacturIA</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Smart Invoicing</div>
          </div>
        </div>

        <div className="space-y-6">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="font-display text-5xl font-bold leading-tight tracking-tight">
            Gérez vos clients, devis et factures avec <span className="text-gradient-primary">élégance</span>.
          </motion.h1>
          <p className="max-w-md text-muted-foreground">Une plateforme premium pensée pour les cabinets d'expertise comptable et fiscale.</p>

          <div className="grid max-w-md gap-3">
            {[
              { icon: Sparkles, t: "Aperçu temps réel pixel-perfect" },
              { icon: FileText, t: "4 modèles professionnels Excel-like" },
              { icon: ShieldCheck, t: "Sécurité de niveau entreprise" },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="glass-subtle flex items-center gap-3 rounded-2xl px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground"><f.icon className="h-4 w-4" /></div>
                <span className="text-sm font-medium">{f.t}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">© 2025 FacturIA. Tous droits réservés.</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-float">
          <div className="lg:hidden mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground font-bold">F</div>
            <span className="font-display text-lg font-bold">FacturIA</span>
          </div>
          <h2 className="font-display text-2xl font-bold">Bienvenue 👋</h2>
          <p className="mt-1 text-sm text-muted-foreground">Connectez-vous pour accéder à votre cabinet.</p>

          <div className="mt-6 space-y-4">
            <FloatField icon={Mail} label="Adresse email" type="email" defaultValue="yasmine@facturia.ma" />
            <FloatField icon={Lock} label="Mot de passe" type="password" defaultValue="••••••••" />
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded border-border" /><span>Se souvenir de moi</span></label>
            <a className="text-primary hover:underline" href="#">Mot de passe oublié ?</a>
          </div>

          <button disabled={loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70">
            {loading ? "Connexion…" : <>Se connecter <ArrowRight className="h-4 w-4" /></>}
          </button>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            Pas encore de compte ? <Link to="/dashboard" className="text-primary font-medium hover:underline">Découvrir la démo</Link>
          </div>
        </motion.form>
      </div>
    </div>
  );
}

function FloatField({ icon: Icon, label, type, defaultValue }: { icon: typeof Mail; label: string; type: string; defaultValue?: string }) {
  return (
    <label className="group block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type={type} defaultValue={defaultValue} className="w-full rounded-2xl border border-border/60 bg-surface/70 px-10 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25" />
      </div>
    </label>
  );
}
