import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { StatusBadge } from "@/components/common/StatusBadge";
import { currency, shortDate } from "@/lib/format";
import { EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/_app/archive")({
  head: () => ({ meta: [{ title: "Archives — FacturIA" }] }),
  component: ArchivePage,
});

function ArchivePage() {
  const documents = useAppStore((s) => s.documents);
  const clients = useAppStore((s) => s.clients);
  // Archive = paid invoices + accepted/rejected quotations
  const archived = documents.filter((d) =>
    (d.type === "invoice" && (d.status === "paid" || d.status === "archived")) ||
    (d.type === "quotation" && (d.status === "accepted" || d.status === "rejected"))
  );

  return (
    <div>
      <PageHeader title="Archives" subtitle="Documents clôturés et historisés." />
      {archived.length === 0 ? <EmptyState icon={Archive} title="Archive vide" description="Vos documents finalisés s'afficheront ici." /> : (
        <div className="glass-panel overflow-hidden rounded-3xl">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-5 py-3 text-left">Numéro</th><th className="px-5 py-3 text-left">Type</th><th className="px-5 py-3 text-left">Client</th><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-left">Statut</th><th className="px-5 py-3 text-right">Montant</th></tr>
            </thead>
            <tbody>
              {archived.map((d) => {
                const c = clients.find((x) => x.id === d.clientId);
                return (
                  <tr key={d.id} className="border-t border-border/40 hover:bg-muted/50">
                    <td className="px-5 py-3 font-medium font-numeric"><Link to={d.type === "invoice" ? "/invoices/$id" : "/quotations/$id"} params={{ id: d.id }} className="hover:text-primary">{d.number}</Link></td>
                    <td className="px-5 py-3 capitalize text-muted-foreground">{d.type === "invoice" ? "Facture" : "Devis"}</td>
                    <td className="px-5 py-3">{c?.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{shortDate(d.issueDate)}</td>
                    <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-5 py-3 text-right font-numeric font-semibold">{currency(d.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
