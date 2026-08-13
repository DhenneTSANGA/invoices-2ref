import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Send,
  Eye,
  Mail,
  PenLine,
  Stamp,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import {
  useDocument,
  useClients,
  useSendDocumentEmail,
  useSession,
  useLetterSignatureRequest,
  useRequestLetterSignature,
  useSignLetterDocument,
  useRejectLetterSignature,
} from "@/hooks/use-data";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { DocumentPdfButton } from "@/components/documents/DocumentPdfButton";
import { DocumentPdfTracesPanel } from "@/components/documents/DocumentPdfTracesPanel";
import { SignedDocumentReadyBanner } from "@/components/documents/SignedDocumentReadyBanner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { longDate } from "@/lib/format";
import { LetterEditor } from "@/components/editor/LetterEditor";
import { isAdmin } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/lettre/$id")({
  head: () => ({ meta: [{ title: "Détail courriel — 2R Hub" }] }),
  component: LetterDetail,
});

function LetterDetail() {
  const { id } = Route.useParams();
  const { data: session } = useSession();
  const { data: doc, isLoading } = useDocument(id);
  const { data: clients = [] } = useClients();
  const { data: signatureReq } = useLetterSignatureRequest(id);
  const client = clients.find((c) => c.id === doc?.clientId);
  const sendEmailMutation = useSendDocumentEmail();
  const requestSignMutation = useRequestLetterSignature();
  const signMutation = useSignLetterDocument();
  const rejectMutation = useRejectLetterSignature();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  /** L’admin doit avoir consulté l’aperçu sur cette page avant de signer. */
  const [previewSeen, setPreviewSeen] = useState(false);

  const role = session?.staff.role;
  const adminLike = role ? isAdmin(role) : false;
  const isCreator = Boolean(
    session?.staff.id && doc?.createdById === session.staff.id,
  );

  // Sur la page détail, l’aperçu est déjà visible → l’admin peut signer sans geste supplémentaire.
  useEffect(() => {
    if (adminLike && doc?.status === "draft") {
      setPreviewSeen(true);
    }
  }, [adminLike, doc?.id, doc?.status]);

  if (isLoading) {
    return (
      <LoadingState
        icon={Mail}
        title="Chargement du courriel"
        description="Ouverture du document…"
      />
    );
  }
  if (!doc) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center">
        Courriel introuvable.
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <button
          onClick={() => setEditing(false)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à l'aperçu
        </button>
        <PageHeader title={`Modifier — ${doc.number}`} subtitle={doc.subject ?? ""} />
        <LetterEditor initial={doc} />
      </div>
    );
  }

  const pending = signatureReq?.status === "pending";
  /** Seuls les membres demandent une signature — admin / SA signent directement. */
  const canRequest =
    doc.status === "draft" && !pending && isCreator && !adminLike;
  const canSign = adminLike && doc.status === "draft" && previewSeen;
  const canSend =
    (doc.status === "signed" || doc.status === "sent") &&
    (isCreator || adminLike);
  const canEdit = doc.status === "draft" && (isCreator || adminLike);

  const markPreviewSeen = () => setPreviewSeen(true);

  return (
    <div>
      <button
        onClick={() => history.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      <PageHeader
        title={doc.number}
        subtitle={`${doc.subject ?? ""} · ${client?.name ?? ""} · ${longDate(doc.issueDate)}`}
        actions={
          <>
            <button
              onClick={() => {
                markPreviewSeen();
                setPreviewOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Eye className="h-4 w-4" /> Aperçu
            </button>
            <DocumentPdfButton doc={doc} appearance="header" />
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Modifier
              </button>
            )}
            {canRequest && (
              <button
                onClick={() => {
                  const toastId = toast.loading("Envoi de la demande…");
                  requestSignMutation.mutate(doc.id, {
                    onSuccess: () =>
                      toast.success("Demande envoyée aux administrateurs", {
                        id: toastId,
                      }),
                    onError: (e) =>
                      toast.error(e.message || "Demande impossible", {
                        id: toastId,
                      }),
                  });
                }}
                disabled={requestSignMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-500/20 disabled:opacity-60 dark:text-amber-100"
              >
                <PenLine className="h-4 w-4" />
                {requestSignMutation.isPending
                  ? "Demande…"
                  : "Demander la signature"}
              </button>
            )}
            {canSign && (
              <button
                onClick={() => {
                  const toastId = toast.loading("Signature en cours…");
                  signMutation.mutate(doc.id, {
                    onSuccess: () =>
                      toast.success("Courriel signé", { id: toastId }),
                    onError: (e) =>
                      toast.error(e.message || "Signature impossible", {
                        id: toastId,
                      }),
                  });
                }}
                disabled={signMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
              >
                <Stamp className="h-4 w-4" />
                {signMutation.isPending ? "Signature…" : "Signer"}
              </button>
            )}
            {adminLike && pending && (
              <button
                onClick={() => {
                  const toastId = toast.loading("Refus…");
                  rejectMutation.mutate(
                    { documentId: doc.id },
                    {
                      onSuccess: () =>
                        toast.success("Demande refusée", { id: toastId }),
                      onError: (e) =>
                        toast.error(e.message || "Refus impossible", {
                          id: toastId,
                        }),
                    },
                  );
                }}
                disabled={rejectMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/15 disabled:opacity-60"
              >
                <Ban className="h-4 w-4" /> Refuser
              </button>
            )}
            <button
              onClick={() => {
                if (!canSend) {
                  toast.error(
                    "Le courriel doit être signé avant l'envoi par e-mail",
                  );
                  return;
                }
                const toastId = toast.loading("Envoi de l'email…");
                sendEmailMutation.mutate(doc, {
                  onSuccess: (res) =>
                    toast.success("Courriel envoyé", {
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
              }}
              disabled={sendEmailMutation.isPending || !canSend}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
            >
              <Send className="h-4 w-4" />{" "}
              {sendEmailMutation.isPending ? "Envoi…" : "Envoyer"}
            </button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={doc.status} />
        {pending && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
            Signature demandée
            {signatureReq?.requestedByName
              ? ` par ${signatureReq.requestedByName}`
              : ""}
          </span>
        )}
        {adminLike && doc.status === "draft" && !previewSeen && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            Consultez l’aperçu ci-dessous pour activer « Signer »
          </span>
        )}
      </div>

      {doc.status === "signed" && <SignedDocumentReadyBanner type={doc.type} />}

      <div
        className={cn(
          "mb-6 cursor-pointer rounded-2xl transition",
          adminLike && doc.status === "draft" && !previewSeen && "ring-2 ring-amber-400/50",
        )}
        onClick={() => {
          markPreviewSeen();
          setPreviewOpen(true);
        }}
        onMouseEnter={markPreviewSeen}
      >
        <DocumentPreview doc={doc} />
      </div>
      <DocumentPdfTracesPanel documentId={doc.id} />
      <DocumentPreviewModal
        doc={doc}
        open={previewOpen}
        onOpenChange={(open) => {
          if (open) markPreviewSeen();
          setPreviewOpen(open);
        }}
      />
    </div>
  );
}
