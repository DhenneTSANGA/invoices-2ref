import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FileText, ReceiptText, Mail, FileSignature } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";

export const Route = createFileRoute("/_app/templates")({
  head: () => ({ meta: [{ title: "Modèles de documents — FacturIA" }] }),
  component: Templates,
});

const templates = [
  { id: "invoice", name: "Facture standard", description: "Modèle Excel-like premium avec mentions légales marocaines.", icon: ReceiptText, gradient: "bg-gradient-primary", to: "/invoices/new" as const },
  { id: "quotation", name: "Devis professionnel", description: "Proposition commerciale détaillée avec validité personnalisable.", icon: FileText, gradient: "bg-gradient-accent", to: "/quotations/new" as const },
  { id: "proforma", name: "Facture pro forma", description: "Document non comptable pour confirmation préalable.", icon: FileSignature, gradient: "bg-gradient-secondary", to: "/invoices/new" as const },
  { id: "letter", name: "Lettre commerciale", description: "Courrier mise en demeure, relance ou accompagnement.", icon: Mail, gradient: "bg-gradient-success", to: "/invoices/new" as const },
];

function Templates() {
  return (
    <div>
      <PageHeader title="Modèles de documents" subtitle="Reproduisent fidèlement vos documents Excel professionnels." />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {templates.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4, scale: 1.02 }} className="glass-panel group relative overflow-hidden rounded-3xl p-6 shadow-soft hover:shadow-glow transition-shadow">
            <div className={`absolute -right-12 -top-12 h-40 w-40 rounded-full ${t.gradient} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`} aria-hidden />
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${t.gradient} text-white shadow-glow`}>
              <t.icon className="h-7 w-7" />
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold">{t.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>

            {/* mini preview */}
            <div className="mt-4 aspect-[1/1.414] w-full overflow-hidden rounded-2xl border border-border/60 bg-white p-3">
              <div className={`h-2 w-20 rounded-full ${t.gradient}`} />
              <div className="mt-2 h-3 w-32 rounded bg-slate-200" />
              <div className="mt-1 h-2 w-24 rounded bg-slate-100" />
              <div className="mt-4 space-y-1">
                {Array.from({ length: 5 }).map((_, k) => (
                  <div key={k} className="flex gap-1">
                    <div className="h-2 flex-1 rounded bg-slate-100" />
                    <div className="h-2 w-10 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
              <div className="mt-3 ml-auto h-3 w-20 rounded bg-slate-200" />
            </div>

            <Link to={t.to} className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]">
              Utiliser ce modèle
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
