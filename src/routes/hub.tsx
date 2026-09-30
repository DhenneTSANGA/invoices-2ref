import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Compass, ReceiptText } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { BrandTheme } from "@/components/layout/BrandTheme";
import { requireReadySession } from "@/lib/app-session-gate";
import { rememberSpace } from "@/lib/app-space";
import { facturationHomePath } from "@/lib/roles";

export const Route = createFileRoute("/hub")({
  head: () => ({
    meta: [
      { title: "Espaces — 2R Hub" },
      {
        name: "description",
        content: "Choisir l’espace facturation ou l’espace prospection.",
      },
    ],
  }),
  beforeLoad: async ({ context }) => requireReadySession(context.queryClient),
  component: HubPage,
});

function HubPage() {
  const { session } = Route.useRouteContext();
  const factuTo = facturationHomePath(session.staff.role);
  const first = session.staff.firstName || "Collaborateur";

  return (
    <div className="aurora-bg flex min-h-screen items-center justify-center px-4 py-12">
      <BrandTheme />
      <div className="w-full max-w-4xl">
        <div className="mb-10 flex flex-col items-center text-center">
          <Logo size="lg" className="rounded-lg" />
          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Bonjour {first}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Deux espaces, un seul compte. La facturation reste à part du canevas
            commercial.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SpaceCard
            to={factuTo}
            space="facturation"
            icon={ReceiptText}
            title="Facturation"
            subtitle="Devis, factures, clients, courriels et dossiers de production."
            delay={0}
          />
          <SpaceCard
            to="/prospection"
            space="prospection"
            icon={Compass}
            title="Prospection"
            subtitle="Pipeline, portefeuille, actions, budget et plans de compte — démo."
            delay={0.08}
          />
        </div>
      </div>
    </div>
  );
}

function SpaceCard({
  to,
  space,
  icon: Icon,
  title,
  subtitle,
  delay,
}: {
  to: "/dashboard" | "/home" | "/prospection";
  space: "facturation" | "prospection";
  icon: typeof ReceiptText;
  title: string;
  subtitle: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Link
        to={to}
        onClick={() => rememberSpace(space)}
        className="group glass-panel flex h-full flex-col rounded-3xl p-6 transition hover:-translate-y-0.5 hover:shadow-float sm:p-8"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold">{title}</h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          Entrer
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </Link>
    </motion.div>
  );
}
