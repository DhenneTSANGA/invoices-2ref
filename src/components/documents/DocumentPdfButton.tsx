import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Document } from "@/store/types";
import { useDownloadDocumentPdf } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  doc: Document;
  className?: string;
  size?: "sm" | "default";
  /** Bouton d’en-tête des pages détail (pas le Button shadcn). */
  appearance?: "button" | "header";
};

/**
 * Téléchargement PDF pour impression : jamais de tampon électronique,
 * zone vide pour paraphe manuscrit. La signature reste sur l’e-mail.
 */
export function DocumentPdfButton({
  doc,
  className,
  size = "default",
  appearance = "button",
}: Props) {
  const downloadPdfMutation = useDownloadDocumentPdf();
  const busy = downloadPdfMutation.isPending;

  const run = () => {
    const toastId = toast.loading("Génération du PDF…");
    downloadPdfMutation.mutate(doc, {
      onSuccess: () =>
        toast.success("PDF téléchargé", {
          id: toastId,
          description: `${doc.number}.pdf — espace pour signature manuscrite`,
        }),
      onError: (err) => {
        console.error(err);
        toast.error("Impossible de générer le PDF", {
          id: toastId,
          description: err instanceof Error ? err.message : undefined,
        });
      },
    });
  };

  const label = (
    <>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      PDF
    </>
  );

  if (appearance === "header") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className={cn(
          "inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60",
          className,
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn("rounded-xl", className)}
      disabled={busy}
      onClick={run}
    >
      {label}
    </Button>
  );
}
