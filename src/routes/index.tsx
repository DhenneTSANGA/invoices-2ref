import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FileText,
  ReceiptText,
  Users,
  FileSignature,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { getCurrentSession } from "@/lib/session.functions";
import {
  documentStatusLabel,
  documentTypeLabel,
} from "@/lib/document-status-labels";
import type { DocumentStatus, DocumentType } from "@/store/types";
import { cn } from "@/lib/utils";

/** Aperçu marketing figé — numéros anonymisés, statuts illustratifs. */
const LANDING_PREVIEW: {
  type: DocumentType;
  numberMasked: string;
  status: DocumentStatus;
}[] = [
  { type: "invoice", numberMasked: "FA-••••-••18", status: "paid" },
  { type: "quotation", numberMasked: "DV-••••-••42", status: "accepted" },
  { type: "letter", numberMasked: "LT-••••-••07", status: "sent" },
  { type: "invoice", numberMasked: "FA-••••-••31", status: "paid" },
  { type: "quotation", numberMasked: "DV-••••-••15", status: "accepted" },
  { type: "letter", numberMasked: "LT-••••-••03", status: "sent" },
];

const typeTone: Record<DocumentType, string> = {
  quotation: "bg-accent/15 text-accent-foreground",
  invoice: "bg-primary/15 text-primary",
  proforma: "bg-muted text-muted-foreground",
  letter: "bg-success/15 text-success",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "2R Expertise Fiscale — Automatisation cabinet fiscal" },
      {
        name: "description",
        content:
          "Gérez clients, devis, factures et pro forma pour le cabinet 2R Expertise Fiscale.",
      },
    ],
  }),
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: LandingPage,
});

const features = [
  {
    icon: Users,
    title: "Clients & dossiers",
    description:
      "Centralisez les fiches clients, NIF, RCCM et contacts pour un suivi clair.",
  },
  {
    icon: FileText,
    title: "Devis professionnels",
    description:
      "Proposez des devis conformes OHADA / CEMAC, prêts à accepter et convertir.",
  },
  {
    icon: ReceiptText,
    title: "Factures & encaissements",
    description:
      "Émettez, suivez et archivez vos factures avec mentions légales du cabinet.",
  },
  {
    icon: FileSignature,
    title: "Pro forma & lettres",
    description:
      "Créez des pro forma et courriers commerciaux au format du cabinet.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <Logo size="xs" className="shrink-0 rounded-md" />
            <span className="font-display truncate text-base font-bold tracking-tight sm:text-lg">
              <span className="sm:hidden">2R</span>
              <span className="hidden sm:inline">2R Expertise Fiscale</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              to="/login"
              className="rounded-2xl px-2.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground sm:px-4"
            >
              Connexion
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow sm:px-4"
            >
              Commencer
              <ArrowRight className="hidden h-4 w-4 sm:block" />
            </Link>
          </div>
        </div>
      </header>

      <section className="aurora-bg relative overflow-x-clip">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:gap-12 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="min-w-0"
          >
            <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-surface/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">Cabinet 2R Expertise Fiscale</span>
            </div>
            <h1 className="font-display text-[1.85rem] font-bold leading-[1.15] tracking-tight break-words sm:text-5xl lg:text-[3.25rem]">
              Automatisez vos{" "}
              <span className="text-gradient-primary">devis</span> et{" "}
              <span className="text-gradient-primary">factures</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-lg">
              2R Expertise Fiscale est la plateforme interne du cabinet pour gérer clients,
              devis, factures, pro forma et lettres — avec les mentions légales
              officielles et un aperçu prêt à exporter.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02] active:scale-[0.98] sm:px-5"
              >
                Créer un compte
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm font-semibold transition hover:bg-muted sm:px-5"
              >
                Se connecter
              </Link>
            </div>
            <div className="mt-8 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>Accès réservé aux collaborateurs du cabinet</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="relative min-w-0"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.6,
              }}
              className="relative mx-auto w-full max-w-md lg:max-w-none"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-primary/20 blur-2xl sm:-inset-4"
              />
              <motion.div
                animate={{
                  boxShadow: [
                    "0 12px 40px -12px oklch(0.62 0.18 258 / 0.28), 0 0 0 1px oklch(0.62 0.18 258 / 0.18)",
                    "0 20px 52px -10px oklch(0.62 0.18 258 / 0.42), 0 0 0 1px oklch(0.62 0.18 258 / 0.32)",
                    "0 12px 40px -12px oklch(0.62 0.18 258 / 0.28), 0 0 0 1px oklch(0.62 0.18 258 / 0.18)",
                  ],
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.6,
                }}
                className="glass-panel relative overflow-hidden rounded-3xl p-4 sm:p-6"
              >
                <div className="mb-4">
                  <div className="text-sm font-semibold">Aperçu documents</div>
                </div>
                <div className="space-y-2.5 sm:space-y-3">
                  {LANDING_PREVIEW.map((row, i) => (
                    <div
                      key={`${row.type}-${row.numberMasked}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-border/50 bg-surface/60 px-3 py-2.5 sm:px-4 sm:py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {documentTypeLabel(row.type)}
                        </div>
                        <div className="font-numeric truncate text-xs text-muted-foreground">
                          {row.numberMasked}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold sm:px-2.5",
                          typeTone[row.type],
                        )}
                      >
                        {documentStatusLabel(row.status)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-gradient-mesh p-3 text-xs leading-relaxed text-muted-foreground sm:p-4">
                  Mentions légales 2R EXPERTISE FISCALE — NIF, RCCM, Libreville
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Tout le cycle commercial du cabinet
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Une seule application pour créer, suivre et exporter vos documents
            fiscaux et commerciaux.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel rounded-3xl p-5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Prêt à démarrer ?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            Créez votre compte collaborateur ou connectez-vous pour accéder au
            tableau de bord 2R Expertise Fiscale.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Commencer
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-2xl border border-border px-5 py-3 text-sm font-semibold hover:bg-muted"
            >
              Connexion
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Logo size="xs" className="rounded-md" />
            <span className="text-sm font-semibold">2R Expertise Fiscale</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} 2R Expertise Fiscale — Tous droits
            réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
