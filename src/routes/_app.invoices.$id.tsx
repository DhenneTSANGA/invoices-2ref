import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle2,
  XCircle,
  Edit3,
  Eye,
  Loader2,
  FileText,
  Repeat,
  PauseCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import {
  useDocument,
  useClients,
  useSetDocumentStatus,
  useSendDocumentEmail,
  useSetInvoiceSubscription,
} from "@/hooks/use-data";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { MarkAsPaidDialog } from "@/components/documents/MarkAsPaidDialog";
import { SubscriptionDialog } from "@/components/documents/SubscriptionDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DocumentCreatorCard } from "@/components/documents/DocumentCreatorCard";
import { downloadDocumentPdf } from "@/lib/pdf/downloadDocumentPdf";
import { currency, longDate, shortDate } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-method";
import type { PaymentMethod } from "@/store/types";

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
  const subscriptionMutation = useSetInvoiceSubscription();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);

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
    paymentMethod?: PaymentMethod,
  ) => {
    setStatusMutation.mutate(
      { id: doc.id, status, paymentMethod },
      {
        onSuccess: (res) => {
          if (level === "warning") toast.warning(message);
          else
            toast.success(message, {
              description:
                status === "paid" && paymentMethod
                  ? paymentMethodLabel(paymentMethod)
                  : undefined,
            });
          if (status === "paid" && res.emailError) {
            toast.warning("Alerte e-mail admins non envoyée", {
              description: res.emailError,
              duration: 12_000,
            });
          } else if (status === "paid" && res.emailSent) {
            toast.message(
              `E-mail envoyé à ${res.emailRecipients ?? 0} admin(s)`,
            );
          }
          setPaidOpen(false);
        },
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

  const pauseSubscription = () => {
    subscriptionMutation.mutate(
      { id: doc.id, enabled: false },
      {
        onSuccess: () => toast.success("Abonnement mis en pause"),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div>
      <button onClick={() => history.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour</button>
      <PageHeader
        title={doc.number}
        subtitle={`${client?.name ?? ""} · Émise le ${longDate(doc.issueDate)}`}
        actions={
          <>
            <Link
              to="/invoices/$id/edit"
              params={{ id: doc.id }}
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Edit3 className="h-4 w-4" /> Modifier
            </Link>
            <button onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"><Eye className="h-4 w-4" /> Aperçu</button>
            <button onClick={downloadPdf} disabled={exporting} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
            </button>
            <button onClick={sendByEmail} disabled={sendEmailMutation.isPending} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"><Send className="h-4 w-4" /> {sendEmailMutation.isPending ? "Envoi…" : "Envoyer"}</button>
            {doc.status !== "paid" && doc.status !== "cancelled" && (
              <button onClick={() => setPaidOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-success px-4 py-2 text-sm font-medium text-success-foreground shadow"><CheckCircle2 className="h-4 w-4" /> Marquer payée</button>
            )}
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
              {doc.status === "paid" && (
                <Row label="Règlement" value={paymentMethodLabel(doc.paymentMethod)} />
              )}
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
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-display font-semibold">Abonnement</h4>
              {doc.isSubscription && doc.subscriptionActive && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Actif
                </span>
              )}
              {doc.isSubscription && !doc.subscriptionActive && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Pause
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Une facture d’abonnement reprend ces lignes chaque mois à la date choisie. Vous pouvez encore modifier la désignation.
            </p>
            {doc.isSubscription && doc.subscriptionDay ? (
              <div className="mt-3 space-y-2 text-sm">
                <Row label="Jour d’envoi" value={`Le ${doc.subscriptionDay} de chaque mois`} />
                <Row
                  label="Prochain envoi"
                  value={
                    doc.subscriptionNextAt
                      ? shortDate(doc.subscriptionNextAt)
                      : "—"
                  }
                />
              </div>
            ) : null}
            <div className="mt-3 flex flex-col gap-2">
              {(!doc.isSubscription || !doc.subscriptionActive) && (
                <button
                  type="button"
                  onClick={() => setSubOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-glow"
                >
                  <Repeat className="h-3.5 w-3.5" />
                  {doc.isSubscription ? "Réactiver l’abonnement" : "Ajouter en abonnement"}
                </button>
              )}
              {doc.isSubscription && doc.subscriptionActive && (
                <button
                  type="button"
                  onClick={pauseSubscription}
                  disabled={subscriptionMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs hover:bg-muted disabled:opacity-60"
                >
                  <PauseCircle className="h-3.5 w-3.5" /> Mettre en pause
                </button>
              )}
              <Link
                to="/invoices/$id/edit"
                params={{ id: doc.id }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs hover:bg-muted"
              >
                <Edit3 className="h-3.5 w-3.5" /> Modifier les lignes
              </Link>
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
      <MarkAsPaidDialog
        open={paidOpen}
        onOpenChange={setPaidOpen}
        documentNumber={doc.number}
        pending={setStatusMutation.isPending}
        onConfirm={(method) =>
          patchStatus("paid", "Marquée comme payée", "success", method)
        }
      />
      <SubscriptionDialog
        open={subOpen}
        onOpenChange={setSubOpen}
        documentNumber={doc.number}
        initialDay={doc.subscriptionDay}
        pending={subscriptionMutation.isPending}
        onConfirm={(dayOfMonth) => {
          subscriptionMutation.mutate(
            { id: doc.id, enabled: true, dayOfMonth },
            {
              onSuccess: (row) => {
                toast.success("Abonnement activé", {
                  description: `Envoi le ${row.subscriptionDay} de chaque mois`,
                });
                setSubOpen(false);
              },
              onError: (e) => toast.error(e.message),
            },
          );
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value}</span></div>;
}
