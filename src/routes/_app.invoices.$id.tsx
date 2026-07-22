import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Send, CheckCircle2, XCircle, Edit3, Eye, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { useDocument, useClients, useSetDocumentStatus, useSendDocumentEmail } from "@/hooks/use-data";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DocumentCreatorCard } from "@/components/documents/DocumentCreatorCard";
import { downloadDocumentPdf } from "@/lib/pdf/downloadDocumentPdf";
import { currency, longDate } from "@/lib/format";

export const Route = createFileRoute("/_app/invoices/$id")({
  head: () => ({ meta: [{ title: "Détail facture — 2R Expertise Fiscale" }] }),
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const { data: doc, isLoading } = useDocument(id);
  const { data: clients = [] } = useClients();
  const client = clients.find((c) => c.id === doc?.clientId);
  const setStatusMutation = useSetDocumentStatus();
  const sendEmailMutation = useSendDocumentEmail();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (isLoading) {
    return (
      <LoadingState
        icon={FileText}
        title="Chargement de la facture"
        description="Ouverture du document…"
      />
    );
  }
  if (!doc) return <div className="glass-panel rounded-3xl p-8 text-center">Document introuvable.</div>;

  const patchStatus = (
    status: typeof doc.status,
    message: string,
    level: "success" | "warning" = "success",
  ) => {
    setStatusMutation.mutate(
      { id: doc.id, status },
      {
        onSuccess: () =>
          level === "warning" ? toast.warning(message) : toast.success(message),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const sendByEmail = () => {
    const toastId = toast.loading("Envoi de l'email…");
    sendEmailMutation.mutate(doc.id, {
      onSuccess: (res) =>
        toast.success("Facture envoyée par email", {
          id: toastId,
          description: `À ${res.to}`,
        }),
      onError: (e) =>
        toast.error("Échec de l'envoi", {
          id: toastId,
          description: e.message,
          duration: 12_000,
        }),
    });
  };

  const downloadPdf = async () => {
    setExporting(true);
    const toastId = toast.loading("Génération du PDF…");
    try {
      await downloadDocumentPdf(doc);
      toast.success("PDF téléchargé", { id: toastId, description: `${doc.number}.pdf` });
    } catch (err) {
      console.error(err);
      toast.error("Impossible de générer le PDF", {
        id: toastId,
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <button onClick={() => history.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour</button>
      <PageHeader
        title={doc.number}
        subtitle={`${client?.name ?? ""} · Émise le ${longDate(doc.issueDate)}`}
        actions={
          <>
            <button onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"><Eye className="h-4 w-4" /> Aperçu</button>
            <button onClick={downloadPdf} disabled={exporting} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
            </button>
            <button onClick={sendByEmail} disabled={sendEmailMutation.isPending} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"><Send className="h-4 w-4" /> {sendEmailMutation.isPending ? "Envoi…" : "Envoyer"}</button>
            <button onClick={() => patchStatus("paid", "Marquée comme payée")} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-success px-4 py-2 text-sm font-medium text-success-foreground shadow"><CheckCircle2 className="h-4 w-4" /> Marquer payée</button>
            <button onClick={() => patchStatus("cancelled", "Facture annulée", "warning")} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200">Annuler</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
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
              <button onClick={() => patchStatus("draft", "Repassée en brouillon")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs hover:bg-muted"><Edit3 className="h-3.5 w-3.5" /> Brouillon</button>
              <button onClick={() => patchStatus("overdue", "Marquée en retard", "warning")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs hover:bg-muted"><XCircle className="h-3.5 w-3.5" /> En retard</button>
            </div>
            <Link to="/invoices/new" className="mt-2 block w-full rounded-xl border border-border bg-surface px-3 py-2 text-center text-xs hover:bg-muted">Dupliquer</Link>
          </div>

          <DocumentCreatorCard creator={doc.createdBy} />
        </aside>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Aperçu</div>
            <button type="button" onClick={() => setPreviewOpen(true)} className="text-xs font-medium text-primary hover:underline">Plein écran</button>
          </div>
          <div className="cursor-pointer" onClick={() => setPreviewOpen(true)}>
            <DocumentPreview doc={doc} />
          </div>
        </div>
      </div>

      <DocumentPreviewModal doc={doc} open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value}</span></div>;
}
