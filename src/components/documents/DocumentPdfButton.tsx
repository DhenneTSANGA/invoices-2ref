import { useRef, useState } from "react";
import { Download, Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import type { Document } from "@/store/types";
import { useDownloadDocumentPdf, useSession } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isAdmin } from "@/lib/roles";

type Props = {
  doc: Document;
  className?: string;
  size?: "sm" | "default";
  /** Bouton d’en-tête des pages détail (pas le Button shadcn). */
  appearance?: "button" | "header";
  /**
   * Éditeur : enregistre le document avant de générer le PDF (numéro définitif,
   * rien de perdu). Renvoie le document enregistré, ou null pour annuler.
   */
  prepare?: () => Promise<Document | null>;
};

function documentIsElectronicallySigned(doc: Document): boolean {
  return (
    doc.status === "signed" ||
    doc.status === "sent" ||
    doc.status === "paid" ||
    doc.status === "accepted"
  );
}

function isPersistedDocId(id: string | undefined): boolean {
  return Boolean(id) && !/^(d|tmp|tpl)-/.test(id!);
}

/**
 * Téléchargement PDF.
 * - « PDF » : tous les utilisateurs, tout statut — sans signature électronique
 *   (espace pour paraphe manuscrit).
 * - « PDF signé » : tous les utilisateurs dès que le document est signé
 *   (signé / envoyé / payé / accepté) ; administrateurs / super admin : toujours.
 */
export function DocumentPdfButton({
  doc,
  className,
  size = "default",
  appearance = "button",
  prepare,
}: Props) {
  const { data: session } = useSession();
  const downloadPdfMutation = useDownloadDocumentPdf();
  const [preparing, setPreparing] = useState(false);
  /** Bouton cliqué (spinner sur celui-ci seulement). */
  const [pendingSigned, setPendingSigned] = useState(false);
  // Verrou synchrone : un double clic ne crée pas deux documents.
  const preparingRef = useRef(false);
  const busy = downloadPdfMutation.isPending || preparing;
  const showSignedPdf =
    documentIsElectronicallySigned(doc) ||
    Boolean(session && isAdmin(session.staff.role));

  // Document déjà enregistré et sorti du brouillon (signé, envoyé, payé…) :
  // téléchargement direct, sans réenregistrement (qui pouvait bloquer le PDF).
  const needsPrepare = Boolean(prepare) && (!isPersistedDocId(doc.id) || doc.status === "draft");

  const run = async (includeSignature: boolean) => {
    setPendingSigned(includeSignature);
    let target = doc;
    if (prepare && needsPrepare) {
      if (preparingRef.current) return;
      preparingRef.current = true;
      setPreparing(true);
      try {
        const saved = await prepare();
        if (!saved) return;
        target = saved;
      } finally {
        preparingRef.current = false;
        setPreparing(false);
      }
    }
    const toastId = toast.loading(
      includeSignature
        ? "Génération du PDF signé…"
        : "Génération du PDF…",
    );
    downloadPdfMutation.mutate(
      { doc: target, includeSignature },
      {
        onSuccess: () =>
          toast.success("PDF téléchargé", {
            id: toastId,
            description: includeSignature
              ? `${target.number}-signe.pdf — avec signature électronique`
              : `${target.number}.pdf — espace pour signature manuscrite`,
          }),
        onError: (err) => {
          console.error(err);
          toast.error("Impossible de générer le PDF", {
            id: toastId,
            description: err instanceof Error ? err.message : undefined,
          });
        },
      },
    );
  };

  const label = (
    <>
      {busy && !pendingSigned ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {busy && !pendingSigned ? (preparing ? "Enregistrement…" : "Impression en cours…") : "PDF"}
    </>
  );

  const signedLabel = (
    <>
      {busy && pendingSigned ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <PenLine className="h-4 w-4" />
      )}
      {busy && pendingSigned ? (preparing ? "Enregistrement…" : "Impression en cours…") : "PDF signé"}
    </>
  );

  if (appearance === "header") {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(false)}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60",
            className,
          )}
        >
          {label}
        </button>
        {showSignedPdf ? (
          <button
            type="button"
            disabled={busy}
            title="PDF avec signature électronique"
            onClick={() => void run(true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60",
              className,
            )}
          >
            {signedLabel}
          </button>
        ) : null}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size={size}
        className={cn("rounded-xl", className)}
        disabled={busy}
        onClick={() => void run(false)}
      >
        {label}
      </Button>
      {showSignedPdf ? (
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={busy}
          title="PDF avec signature électronique"
          className={cn("rounded-xl", className)}
          onClick={() => void run(true)}
        >
          {signedLabel}
        </Button>
      ) : null}
    </span>
  );
}
