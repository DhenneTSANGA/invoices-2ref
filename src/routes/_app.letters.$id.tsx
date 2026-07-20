import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Download, Send, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { useDocument, useClients, useSetDocumentStatus } from "@/hooks/use-data";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { downloadDocumentPdf } from "@/lib/pdf/downloadDocumentPdf";
import { longDate } from "@/lib/format";
import { LetterEditor } from "@/components/editor/LetterEditor";

export const Route = createFileRoute("/_app/letters/$id")({
  head: () => ({ meta: [{ title: "Détail lettre — 2REF-AUTO" }] }),
  component: LetterDetail,
});

function LetterDetail() {
  const { id } = Route.useParams();
  const { data: doc, isLoading } = useDocument(id);
  const { data: clients = [] } = useClients();
  const client = clients.find((c) => c.id === doc?.clientId);
  const setStatusMutation = useSetDocumentStatus();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (isLoading) return <div className="py-20 text-center text-sm text-muted-foreground">Chargement…</div>;
  if (!doc) return <div className="glass-panel rounded-3xl p-8 text-center">Lettre introuvable.</div>;

  if (editing) {
    return (
      <div>
        <button onClick={() => setEditing(false)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour à l'aperçu
        </button>
        <PageHeader title={`Modifier — ${doc.number}`} subtitle={doc.subject ?? ""} />
        <LetterEditor initial={doc} />
      </div>
    );
  }

  const downloadPdf = async () => {
    setExporting(true);
    const toastId = toast.loading("Génération du PDF…");
    try {
      await downloadDocumentPdf(doc);
      toast.success("PDF téléchargé", { id: toastId, description: `${doc.number}.pdf` });
    } catch (err) {
      console.error(err);
      toast.error("Impossible de générer le PDF", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <button onClick={() => history.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      <PageHeader
        title={doc.number}
        subtitle={`${doc.subject ?? ""} · ${client?.name ?? ""} · ${longDate(doc.issueDate)}`}
        actions={
          <>
            <button onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted">
              <Eye className="h-4 w-4" /> Aperçu
            </button>
            <button onClick={downloadPdf} disabled={exporting} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
            </button>
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted">
              Modifier
            </button>
            <button onClick={() => setStatusMutation.mutate({ id: doc.id, status: "sent" }, { onSuccess: () => toast.success("Lettre marquée comme envoyée"), onError: (e) => toast.error(e.message) })} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">
              <Send className="h-4 w-4" /> Envoyer
            </button>
          </>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <StatusBadge status={doc.status} />
      </div>
      <div className="cursor-pointer" onClick={() => setPreviewOpen(true)}>
        <DocumentPreview doc={doc} />
      </div>
      <DocumentPreviewModal doc={doc} open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
}
