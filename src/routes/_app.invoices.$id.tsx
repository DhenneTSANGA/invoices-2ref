import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Send, CheckCircle2, XCircle, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { StatusBadge } from "@/components/common/StatusBadge";
import { currency, longDate } from "@/lib/format";

export const Route = createFileRoute("/_app/invoices/$id")({
  head: () => ({ meta: [{ title: "Détail facture — FacturIA" }] }),
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const doc = useAppStore((s) => s.documents.find((d) => d.id === id));
  const client = useAppStore((s) => s.clients.find((c) => c.id === doc?.clientId));
  const setStatus = useAppStore((s) => s.setDocumentStatus);

  if (!doc) return <div className="glass-panel rounded-3xl p-8 text-center">Document introuvable.</div>;

  return (
    <div>
      <button onClick={() => history.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour</button>
      <PageHeader
        title={doc.number}
        subtitle={`${client?.name ?? ""} · Émise le ${longDate(doc.issueDate)}`}
        actions={
          <>
            <button onClick={() => toast.info("Export PDF prêt", { description: "Téléchargement simulé." })} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"><Download className="h-4 w-4" /> PDF</button>
            <button onClick={() => { setStatus(doc.id, "sent"); toast.success("Facture envoyée"); }} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"><Send className="h-4 w-4" /> Envoyer</button>
            <button onClick={() => { setStatus(doc.id, "paid"); toast.success("Marquée comme payée"); }} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-success px-4 py-2 text-sm font-medium text-success-foreground shadow"><CheckCircle2 className="h-4 w-4" /> Marquer payée</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_minmax(0,720px)]">
        <aside className="space-y-4">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Statut</span>
              <StatusBadge status={doc.status} />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Client" value={client?.name ?? "—"} />
              <Row label="Émission" value={longDate(doc.issueDate)} />
              <Row label="Échéance" value={longDate(doc.dueDate)} />
              <Row label="Conditions" value={doc.paymentTerms ?? "—"} />
            </div>
            <div className="mt-5 rounded-2xl bg-gradient-mesh p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total TTC</div>
              <div className="font-display text-3xl font-bold text-gradient-primary">{currency(doc.total)}</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-surface-2 p-2"><div className="text-muted-foreground">Sous-total HT</div><div className="font-numeric font-semibold">{currency(doc.subtotal)}</div></div>
              <div className="rounded-xl bg-surface-2 p-2"><div className="text-muted-foreground">TVA</div><div className="font-numeric font-semibold">{currency(doc.vat)}</div></div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <h4 className="font-display font-semibold">Actions</h4>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => { setStatus(doc.id, "draft"); toast.success("Repassée en brouillon"); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs hover:bg-muted"><Edit3 className="h-3.5 w-3.5" /> Brouillon</button>
              <button onClick={() => { setStatus(doc.id, "overdue"); toast.warning("Marquée en retard"); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs hover:bg-muted"><XCircle className="h-3.5 w-3.5" /> En retard</button>
            </div>
            <Link to="/invoices/new" className="mt-2 block w-full rounded-xl border border-border bg-surface px-3 py-2 text-center text-xs hover:bg-muted">Dupliquer</Link>
          </div>
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
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
