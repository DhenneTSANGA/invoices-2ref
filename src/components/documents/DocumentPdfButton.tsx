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
};

function documentIsElectronicallySigned(doc: Document): boolean {
  return (
    doc.status === "signed" ||
    doc.status === "sent" ||
    doc.status === "paid" ||
    doc.status === "accepted"
  );
}

/**
 * Téléchargement PDF.
 * - Document déjà signé / envoyé / payé : PDF avec signature électronique.
 * - Brouillon : PDF sans tampon (espace pour paraphe manuscrit).
 * Les admins peuvent aussi prévisualiser le PDF signé sur un brouillon.
 */
export function DocumentPdfButton({
  doc,
  className,
  size = "default",
  appearance = "button",
}: Props) {
  const { data: session } = useSession();
  const downloadPdfMutation = useDownloadDocumentPdf();
  const busy = downloadPdfMutation.isPending;
  const alreadySigned = documentIsElectronicallySigned(doc);
  const showDraftSignedPreview =
    Boolean(session && isAdmin(session.staff.role)) && !alreadySigned;

  const run = (includeSignature: boolean) => {
    const toastId = toast.loading(
      includeSignature
        ? "Génération du PDF signé…"
        : "Génération du PDF…",
    );
    downloadPdfMutation.mutate(
      { doc, includeSignature },
      {
        onSuccess: () =>
          toast.success("PDF téléchargé", {
            id: toastId,
            description: includeSignature
              ? `${doc.number}-signe.pdf — avec signature électronique`
              : `${doc.number}.pdf — espace pour signature manuscrite`,
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
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {busy ? "Impression en cours…" : alreadySigned ? "PDF signé" : "PDF"}
    </>
  );

  const signedLabel = (
    <>
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <PenLine className="h-3.5 w-3.5" />
      )}
      {busy ? "Impression en cours…" : "PDF signé"}
    </>
  );

  if (appearance === "header") {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(alreadySigned)}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60",
            className,
          )}
        >
          {label}
        </button>
        {showDraftSignedPreview ? (
          <button
            type="button"
            disabled={busy}
            title="Aperçu admin : PDF avec signature électronique"
            onClick={() => run(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-2 text-xs font-medium text-muted-foreground/80 hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            {signedLabel}
          </button>
        ) : null}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size={size}
        className={cn("rounded-xl", className)}
        disabled={busy}
        onClick={() => run(alreadySigned)}
      >
        {label}
      </Button>
      {showDraftSignedPreview ? (
        <Button
          type="button"
          variant="ghost"
          size={size}
          disabled={busy}
          title="Aperçu admin : PDF avec signature électronique"
          className={cn(
            "rounded-xl text-muted-foreground/80 hover:text-foreground",
            size === "sm" ? "px-2 text-xs" : "text-xs",
            className,
          )}
          onClick={() => run(true)}
        >
          {signedLabel}
        </Button>
      ) : null}
    </span>
  );
}
