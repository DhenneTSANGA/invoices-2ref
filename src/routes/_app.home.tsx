import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { FileText, Plus, ReceiptText, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useClients, useDocuments, useSession } from "@/hooks/use-data";
import { currency, shortDate } from "@/lib/format";
import { canAccessDashboard } from "@/lib/roles";
import { CABINET_LABELS } from "@/lib/cabinets";
import { getCurrentSession } from "@/lib/session.functions";

export const Route = createFileRoute("/_app/home")({
  head: () => ({ meta: [{ title: "Accueil — 2R" }] }),
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (session && canAccessDashboard(session.staff.role)) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: HomePage,
});

function HomePage() {
  const { data: session } = useSession();
  const { data: documents = [] } = useDocuments();
  const { data: clients = [] } = useClients();
  const mine = documents.filter((d) => d.createdById === session?.staff.id);
  const recent = [...documents]
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        title={`Bonjour ${session?.staff.firstName ?? ""}`}
        subtitle={
          session
            ? `${CABINET_LABELS[session.activeCabinet]} — vos documents et ceux du cabinet.`
            : "Espace collaborateur"
        }
        actions={
          <>
            <Link
              to="/quotations/new"
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface/70 px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <FileText className="h-4 w-4" /> Devis
            </Link>
            <Link
              to="/invoices/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
            >
              <Plus className="h-4 w-4" /> Facture
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Mes documents" value={mine.length} icon={FileText} />
        <StatCard label="Documents cabinet" value={documents.length} icon={ReceiptText} variant="accent" />
        <StatCard label="Clients" value={clients.length} icon={Users} />
      </div>

      <div className="glass-panel mt-6 overflow-hidden rounded-3xl">
        <div className="border-b border-border/50 px-5 py-4">
          <h3 className="font-display font-semibold">Documents récents du cabinet</h3>
          <p className="text-xs text-muted-foreground">
            Lecture seule si vous n’êtes pas l’auteur.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left">Numéro</th>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Statut</th>
                <th className="px-5 py-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((d) => {
                const client = clients.find((c) => c.id === d.clientId);
                const own = d.createdById === session?.staff.id;
                return (
                  <tr key={d.id} className="border-t border-border/40 hover:bg-muted/50">
                    <td className="px-5 py-3 font-medium">
                      <Link
                        to={d.type === "invoice" ? "/invoices/$id" : "/quotations/$id"}
                        params={{ id: d.id }}
                        className="hover:text-primary"
                      >
                        {d.number}
                      </Link>
                      {!own && (
                        <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                          lecture
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">{client?.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{shortDate(d.issueDate)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-numeric font-semibold">
                      {currency(d.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
