import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Mail, Plus, Eye } from "lucide-react";
import { useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { useAppStore } from "@/store/useAppStore";
import { shortDate } from "@/lib/format";
import { StatusBadge } from "@/components/common/StatusBadge";

export const Route = createFileRoute("/_app/letters/")({
  head: () => ({ meta: [{ title: "Lettres — FacturIA" }] }),
  component: LettersPage,
});

function LettersPage() {
  const documents = useAppStore((s) => s.documents);
  const clients = useAppStore((s) => s.clients);
  const letters = useMemo(
    () => documents.filter((d) => d.type === "letter"),
    [documents],
  );

  return (
    <div>
      <PageHeader
        title="Lettres commerciales"
        subtitle="Courriers accessibles depuis les modèles — non listés dans le menu principal."
        actions={
          <Link to="/letters/new" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4" /> Nouvelle lettre
          </Link>
        }
      />

      {letters.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Aucune lettre"
          description="Créez une lettre depuis la page Modèles."
          action={
            <Link to="/templates" className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">
              Voir les modèles
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {letters.map((d, i) => {
            const client = clients.find((c) => c.id === d.clientId);
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div>
                  <div className="font-numeric font-semibold">{d.number}</div>
                  <div className="text-sm text-muted-foreground">{d.subject || "Sans objet"} · {client?.name}</div>
                  <div className="text-xs text-muted-foreground">{shortDate(d.issueDate)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={d.status} />
                  <Link to="/letters/$id" params={{ id: d.id }} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-muted">
                    <Eye className="h-3.5 w-3.5" /> Ouvrir
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
