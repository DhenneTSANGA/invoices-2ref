import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Download, Send, Eye, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import {
  useDocument,
  useClients,
  useSendDocumentEmail,
  useDownloadDocumentPdf,
} from "@/hooks/use-data";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { DocumentPdfTracesPanel } from "@/components/documents/DocumentPdfTracesPanel";
import { StatusBadge } from "@/components/common/StatusBadge";
import { longDate } from "@/lib/format";
import { LetterEditor } from "@/components/editor/LetterEditor";

export const Route = createFileRoute("/_app/lettre/$id")({
  head: () => ({ meta: [{ title: "Détail lettre — 2R Expertise Fiscale" }] }),
  component: LetterDetail,
});

function LetterDetail() {
  const { id } = Route.useParams();
  const { data: doc, isLoading } = useDocument(id);
  const { data: clients = [] } = useClients();
  const client = clients.find((c) => c.id === doc?.clientId);
  const sendEmailMutation = useSendDocumentEmail();
  const downloadPdfMutation = useDownloadDocumentPdf();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <LoadingState
        icon={Mail}
        title="Chargement de la lettre"
        description="Ouverture du document…"
      />
    );
  }
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

  const downloadPdf = () => {
    const toastId = toast.loading("Génération du PDF…");
    downloadPdfMutation.mutate(doc, {
      onSuccess: () =>
        toast.success("PDF téléchargé", {
          id: toastId,
          description: `${doc.number}.pdf`,
        }),
      onError: (err) => {
        console.error(err);
        toast.error("Impossible de générer le PDF", { id: toastId });
      },
    });
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
            <button onClick={downloadPdf} disabled={downloadPdfMutation.isPending} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60">
              {downloadPdfMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
            </button>
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted">
              Modifier
            </button>
            <button onClick={() => {
              const toastId = toast.loading("Envoi de l'email…");
              sendEmailMutation.mutate(doc, {
                onSuccess: (res) =>
                  toast.success("Lettre envoyée par email", {
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
            }} disabled={sendEmailMutation.isPending} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60">
              <Send className="h-4 w-4" /> {sendEmailMutation.isPending ? "Envoi…" : "Envoyer"}
            </button>
          </>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <StatusBadge status={doc.status} />
      </div>
      <div className="mb-6 cursor-pointer" onClick={() => setPreviewOpen(true)}>
        <DocumentPreview doc={doc} />
      </div>
      <DocumentPdfTracesPanel documentId={doc.id} />
      <DocumentPreviewModal doc={doc} open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
}
