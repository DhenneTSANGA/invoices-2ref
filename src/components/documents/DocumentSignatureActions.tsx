import { Ban, PenLine, Stamp } from "lucide-react";
import { toast } from "sonner";
import {
  useLetterSignatureRequest,
  useRejectLetterSignature,
  useRequestLetterSignature,
  useSession,
  useSignLetterDocument,
} from "@/hooks/use-data";
import { isAdmin } from "@/lib/roles";
import type { Document } from "@/store/types";
import { cn } from "@/lib/utils";

type Props = {
  doc: Document;
  /** true si l’admin a consulté l’aperçu (ou auto sur page détail). */
  previewSeen: boolean;
  className?: string;
  /** Style compact pour barre d’actions. */
  compact?: boolean;
};

/**
 * Actions signature en ligne (courriel / facture / devis).
 * - Membre : Demander la signature
 * - Admin / SA : Signer / Refuser (après consultation de l’aperçu)
 * Le PDF reste disponible pour signature physique.
 */
export function DocumentSignatureActions({
  doc,
  previewSeen,
  className,
  compact,
}: Props) {
  const { data: session } = useSession();
  const { data: signatureReq } = useLetterSignatureRequest(doc.id);
  const requestSignMutation = useRequestLetterSignature();
  const signMutation = useSignLetterDocument();
  const rejectMutation = useRejectLetterSignature();

  const role = session?.staff.role;
  const adminLike = role ? isAdmin(role) : false;
  const isCreator = Boolean(
    session?.staff.id && doc.createdById === session.staff.id,
  );
  const pending = signatureReq?.status === "pending";
  const alreadySigned =
    doc.status === "signed" ||
    doc.status === "sent" ||
    doc.status === "paid";

  /** Membres (créateur) : demander une signature — admin / SA signent directement. */
  const canRequest =
    !alreadySigned &&
    doc.status === "draft" &&
    !pending &&
    isCreator &&
    !adminLike;

  const canSign =
    adminLike && !alreadySigned && doc.status === "draft" && previewSeen;

  if (alreadySigned) return null;

  const btn = compact
    ? "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium disabled:opacity-60"
    : "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium disabled:opacity-60";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {pending && (
        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
          Signature demandée
          {signatureReq?.requestedByName
            ? ` par ${signatureReq.requestedByName}`
            : ""}
        </span>
      )}
      {canRequest && (
        <button
          type="button"
          disabled={requestSignMutation.isPending}
          className={cn(
            btn,
            "border border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100",
          )}
          onClick={() => {
            const toastId = toast.loading("Envoi de la demande…");
            requestSignMutation.mutate(doc.id, {
              onSuccess: () =>
                toast.success("Demande envoyée aux administrateurs", {
                  id: toastId,
                  description:
                    "Sinon, téléchargez le PDF pour une signature physique.",
                }),
              onError: (e) =>
                toast.error(e.message || "Demande impossible", { id: toastId }),
            });
          }}
        >
          <PenLine className="h-4 w-4" />
          {requestSignMutation.isPending
            ? "Demande…"
            : "Demander la signature"}
        </button>
      )}
      {canSign && (
        <button
          type="button"
          disabled={signMutation.isPending}
          className={cn(
            btn,
            "bg-gradient-primary text-primary-foreground shadow-glow",
          )}
          onClick={() => {
            const toastId = toast.loading("Signature en cours…");
            signMutation.mutate(doc.id, {
              onSuccess: () =>
                toast.success("Document signé", { id: toastId }),
              onError: (e) =>
                toast.error(e.message || "Signature impossible", {
                  id: toastId,
                }),
            });
          }}
        >
          <Stamp className="h-4 w-4" />
          {signMutation.isPending ? "Signature…" : "Signer"}
        </button>
      )}
      {adminLike && pending && (
        <button
          type="button"
          disabled={rejectMutation.isPending}
          className={cn(
            btn,
            "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/15",
          )}
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
        >
          <Ban className="h-4 w-4" /> Refuser
        </button>
      )}
      {adminLike && !previewSeen && doc.status === "draft" && (
        <span className="text-xs text-muted-foreground">
          Consultez l’aperçu pour activer la signature.
        </span>
      )}
    </div>
  );
}

export function documentCanSendEmail(doc: Document): boolean {
  return (
    doc.status === "signed" ||
    doc.status === "sent" ||
    doc.status === "paid"
  );
}
