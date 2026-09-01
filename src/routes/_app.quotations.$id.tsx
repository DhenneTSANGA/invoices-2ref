import { useState, useEffect } from "react";
import { createFileRoute, Link, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Send, CheckCircle2, XCircle, Edit3, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import {
  useDocument,
  useClients,
  useSetDocumentStatus,
  useSendDocumentEmail,
  useSession,
  useConvertQuotationToInvoice,
} from "@/hooks/use-data";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { DocumentPdfButton } from "@/components/documents/DocumentPdfButton";
import {
  DocumentSignatureActions,
  documentCanSendEmail,
} from "@/components/documents/DocumentSignatureActions";
import { SignedDocumentReadyBanner } from "@/components/documents/SignedDocumentReadyBanner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DocumentCreatorCard } from "@/components/documents/DocumentCreatorCard";
import { DocumentPdfTracesPanel } from "@/components/documents/DocumentPdfTracesPanel";
import { currency, longDate } from "@/lib/format";
import { isAdmin } from "@/lib/roles";
import { isAccountantSignatory } from "@/lib/signatory";

export const Route = createFileRoute("/_app/quotations/$id")({
  head: () => ({ meta: [{ title: "Détail devis — 2R Hub" }] }),
  component: QuotationDetail,
});

function QuotationDetail() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) {
    return <Outlet />;
  }

  return <QuotationDetailPage />;
}

function QuotationDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data: doc, isLoading } = useDocument(id);
  const { data: clients = [] } = useClients();
  const client = clients.find((c) => c.id === doc?.clientId);
  const setStatusMutation = useSetDocumentStatus();
  const sendEmailMutation = useSendDocumentEmail();
  const convertMutation = useConvertQuotationToInvoice();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSeen, setPreviewSeen] = useState(false);

  const adminLike = session ? isAdmin(session.staff.role) : false;

  useEffect(() => {
    if (adminLike && doc?.status === "draft") setPreviewSeen(true);
  }, [adminLike, doc?.id, doc?.status]);

  if (isLoading) {
    return (
      <LoadingState
        icon={FileText}
        title="Chargement du devis"
        description="Ouverture du document…"
      />
    );
  }
  if (!doc) return <div className="glass-panel rounded-3xl p-8 text-center">Devis introuvable.</div>;

  const canSend = documentCanSendEmail(doc);
  const accountantSignatory = isAccountantSignatory(doc.signatoryTitle);

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

  const canConvert =
    doc.status !== "rejected" && doc.status !== "cancelled";

  const convertToInvoice = () => {
    convertMutation.mutate(doc.id, {
      onSuccess: (invoice) => {
        toast.success("Facture créée à partir du devis", {
          description: invoice.number,
        });
        void navigate({
          to: "/invoices/$id/edit",
          params: { id: invoice.id },
        });
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const sendByEmail = () => {
    if (!canSend) {
      toast.error(
        "Le devis doit être signé avant l’envoi (signature en ligne ou PDF physique).",
      );
      return;
    }
    const toastId = toast.loading("Envoi de l'email…");
    sendEmailMutation.mutate(doc, {
      onSuccess: (res) =>
        toast.success("Devis envoyé par email", {
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

  return (
    <div>
      <button onClick={() => history.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour</button>
      <PageHeader
        title={doc.number}
        subtitle={`${client?.name ?? ""} · ${longDate(doc.issueDate)}`}
        actions={
          <>
            <Link
              to="/quotations/$id/edit"
              params={{ id: doc.id }}
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Edit3 className="h-4 w-4" /> Modifier
            </Link>
            <button onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"><Eye className="h-4 w-4" /> Aperçu</button>
            <DocumentPdfButton doc={doc} appearance="header" />
            {!accountantSignatory ? (
              <DocumentSignatureActions doc={doc} previewSeen={previewSeen} compact />
            ) : null}
            {!accountantSignatory ? (
              <button onClick={sendByEmail} disabled={sendEmailMutation.isPending || !canSend} className={doc.status === "signed" ? "inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60" : "inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"}><Send className="h-4 w-4" /> {sendEmailMutation.isPending ? "Envoi…" : "Envoyer"}</button>
            ) : null}
            <button onClick={() => patchStatus("accepted", "Devis accepté")} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-success px-4 py-2 text-sm font-medium text-success-foreground shadow"><CheckCircle2 className="h-4 w-4" /> Accepter</button>
            <button onClick={() => patchStatus("rejected", "Devis refusé", "warning")} className="inline-flex items-center gap-2 rounded-2xl border border-red-700 bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700"><XCircle className="h-4 w-4" /> Refuser</button>
            <button onClick={() => patchStatus("cancelled", "Devis annulé", "warning")} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200">Annuler</button>
          </>
        }
      />

      {doc.status === "draft" && !accountantSignatory && (
        <div className="glass-panel mb-4 rounded-3xl p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-sm font-semibold">Signature</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {adminLike
                  ? "Relisez l’aperçu puis signez (ou refusez la demande). Le PDF reste disponible pour une signature physique."
                  : "Demandez la signature de la Direction (notification). Vous pouvez aussi télécharger le PDF pour une signature physique."}
              </p>
            </div>
            <DocumentSignatureActions doc={doc} previewSeen={previewSeen} />
          </div>
        </div>
      )}

      {doc.status === "draft" && accountantSignatory && (
        <p className="mb-4 text-xs text-muted-foreground">
          Signataire Chef comptable : téléchargez le PDF pour paraphe manuscrit.
        </p>
      )}

      {doc.status === "draft" && !accountantSignatory && (
        <p className="mb-4 text-xs text-muted-foreground">
          L’envoi e-mail nécessite le statut « Signé ».
        </p>
      )}

      {doc.status === "signed" && <SignedDocumentReadyBanner type={doc.type} />}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="glass-panel h-fit rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Statut</span>
              <StatusBadge status={doc.status} />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Client" value={client?.name ?? "—"} />
              <Row label="Émission" value={longDate(doc.issueDate)} />
              <Row label="Échéance" value={doc.dueDate ? longDate(doc.dueDate) : "—"} />
            </div>
            <div className="mt-4 rounded-2xl bg-gradient-mesh p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total TTC</div>
              <div className="font-display text-3xl font-bold text-gradient-primary">{currency(doc.total)}</div>
            </div>
            {doc.tps > 0 ? (
              <div className="mt-3 rounded-xl bg-surface-2 p-2 text-xs">
                <div className="text-muted-foreground">TPS déduite</div>
                <div className="font-numeric font-semibold">{currency(-doc.tps)}</div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={convertToInvoice}
              disabled={convertMutation.isPending || !canConvert}
              className="mt-4 block w-full rounded-xl bg-gradient-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {convertMutation.isPending ? "Conversion…" : "Convertir en facture"}
            </button>
          </div>
          <DocumentCreatorCard creator={doc.createdBy} />
          <DocumentPdfTracesPanel documentId={doc.id} />
        </aside>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Aperçu</div>
            <button type="button" onClick={() => setPreviewOpen(true)} className="text-xs font-medium text-primary hover:underline">Plein écran</button>
          </div>
          <div
            className="cursor-pointer"
            onClick={() => {
              setPreviewSeen(true);
              setPreviewOpen(true);
            }}
            onMouseEnter={() => setPreviewSeen(true)}
          >
            <DocumentPreview doc={doc} />
          </div>
        </div>
      </div>

      <DocumentPreviewModal
        doc={doc}
        open={previewOpen}
        onOpenChange={(o) => {
          setPreviewOpen(o);
          if (o) setPreviewSeen(true);
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value}</span></div>;
}
