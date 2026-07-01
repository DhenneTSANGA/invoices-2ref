import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Send, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { StatusBadge } from "@/components/common/StatusBadge";
import { currency, longDate } from "@/lib/format";

export const Route = createFileRoute("/_app/quotations/$id")({
  head: () => ({ meta: [{ title: "Détail devis — FacturIA" }] }),
  component: QuotationDetail,
});

function QuotationDetail() {
  const { id } = Route.useParams();
  const doc = useAppStore((s) => s.documents.find((d) => d.id === id));
  const client = useAppStore((s) => s.clients.find((c) => c.id === doc?.clientId));
  const setStatus = useAppStore((s) => s.setDocumentStatus);

  if (!doc) return <div className="glass-panel rounded-3xl p-8 text-center">Devis introuvable.</div>;

  return (
    <div>
      <button onClick={() => history.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour</button>
      <PageHeader
        title={doc.number}
        subtitle={`${client?.name ?? ""} · ${longDate(doc.issueDate)}`}
        actions={
          <>
            <button onClick={() => toast.info("Export PDF prêt")} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"><Download className="h-4 w-4" /> PDF</button>
            <button onClick={() => { setStatus(doc.id, "sent"); toast.success("Devis envoyé"); }} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"><Send className="h-4 w-4" /> Envoyer</button>
            <button onClick={() => { setStatus(doc.id, "accepted"); toast.success("Devis accepté"); }} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-success px-4 py-2 text-sm font-medium text-success-foreground shadow"><CheckCircle2 className="h-4 w-4" /> Accepter</button>
            <button onClick={() => { setStatus(doc.id, "rejected"); toast.warning("Devis refusé"); }} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-danger px-4 py-2 text-sm font-medium text-danger-foreground shadow"><XCircle className="h-4 w-4" /> Refuser</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_minmax(0,720px)]">
        <aside className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Statut</span>
            <StatusBadge status={doc.status} />
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Client" value={client?.name ?? "—"} />
            <Row label="Émission" value={longDate(doc.issueDate)} />
            <Row label="Validité" value={longDate(doc.dueDate)} />
          </div>
          <div className="mt-4 rounded-2xl bg-gradient-mesh p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total TTC</div>
            <div className="font-display text-3xl font-bold text-gradient-primary">{currency(doc.total)}</div>
          </div>
          <Link to="/invoices/new" className="mt-4 block w-full rounded-xl bg-gradient-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground shadow-glow">Convertir en facture</Link>
        </aside>
        <div>
          <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Aperçu</div>
          <DocumentPreview doc={doc} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value}</span></div>;
}
