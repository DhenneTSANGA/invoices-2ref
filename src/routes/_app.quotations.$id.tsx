import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Send, CheckCircle2, XCircle, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { useDocument, useClients, useSetDocumentStatus } from "@/hooks/use-data";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { downloadDocumentPdf } from "@/lib/pdf/downloadDocumentPdf";
import { currency, longDate } from "@/lib/format";

export const Route = createFileRoute("/_app/quotations/$id")({
  head: () => ({ meta: [{ title: "Détail devis — 2REF-AUTO" }] }),
  component: QuotationDetail,
});

function QuotationDetail() {
  const { id } = Route.useParams();
  const { data: doc, isLoading } = useDocument(id);
  const { data: clients = [] } = useClients();
  const client = clients.find((c) => c.id === doc?.clientId);
  const setStatusMutation = useSetDocumentStatus();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (isLoading) return <div className="py-20 text-center text-sm text-muted-foreground">Chargement…</div>;
  if (!doc) return <div className="glass-panel rounded-3xl p-8 text-center">Devis introuvable.</div>;

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
        subtitle={`${client?.name ?? ""} · ${longDate(doc.issueDate)}`}
        actions={
          <>
            <button onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"><Eye className="h-4 w-4" /> Aperçu</button>
            <button onClick={downloadPdf} disabled={exporting} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
            </button>
            <button onClick={() => patchStatus("sent", "Devis envoyé")} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"><Send className="h-4 w-4" /> Envoyer</button>
            <button onClick={() => patchStatus("accepted", "Devis accepté")} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-success px-4 py-2 text-sm font-medium text-success-foreground shadow"><CheckCircle2 className="h-4 w-4" /> Accepter</button>
            <button onClick={() => patchStatus("rejected", "Devis refusé", "warning")} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-danger px-4 py-2 text-sm font-medium text-danger-foreground shadow"><XCircle className="h-4 w-4" /> Refuser</button>
            <button onClick={() => patchStatus("cancelled", "Devis annulé", "warning")} className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100">Annuler</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="glass-panel h-fit rounded-3xl p-5">
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
