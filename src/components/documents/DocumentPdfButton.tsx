import { ChevronDown, Download, Loader2, PenLine, Stamp } from "lucide-react";
import { toast } from "sonner";
import type { Document } from "@/store/types";
import { useDownloadDocumentPdf } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function documentHasElectronicStamp(doc: Document) {
  if (doc.type === "quotation") {
    return doc.status === "signed" || doc.status === "sent" || doc.status === "accepted";
  }
  if (doc.type === "letter") {
    return doc.status === "signed" || doc.status === "sent";
  }
  return doc.status === "signed" || doc.status === "sent" || doc.status === "paid";
}

type Props = {
  doc: Document;
  className?: string;
  size?: "sm" | "default";
  /** Bouton d’en-tête des pages détail (pas le Button shadcn). */
  appearance?: "button" | "header";
  /**
   * Si défini, un clic télécharge directement dans ce mode
   * (ex. interrupteur « Retirer la signature » de l’aperçu).
   */
  omitSignature?: boolean;
};

/**
 * Téléchargement PDF : avec tampon électronique, ou zone vide pour paraphe manuscrit.
 */
export function DocumentPdfButton({
  doc,
  className,
  size = "default",
  appearance = "button",
  omitSignature,
}: Props) {
  const downloadPdfMutation = useDownloadDocumentPdf();
  const busy = downloadPdfMutation.isPending;
  const hasStamp = documentHasElectronicStamp(doc);
  const forced = typeof omitSignature === "boolean";
  const showMenu = hasStamp && !forced;

  const run = (omit: boolean) => {
    const toastId = toast.loading("Génération du PDF…");
    downloadPdfMutation.mutate(
      { doc, omitSignature: omit },
      {
        onSuccess: () =>
          toast.success("PDF téléchargé", {
            id: toastId,
            description: omit
              ? `${doc.number}.pdf — espace pour signature manuscrite`
              : `${doc.number}.pdf`,
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
      PDF
      {showMenu ? <ChevronDown className="h-3.5 w-3.5 opacity-70" /> : null}
    </>
  );

  if (!showMenu) {
    const omit = omitSignature ?? true;
    if (appearance === "header") {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(omit)}
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
        onClick={() => run(omit)}
      >
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {appearance === "header" ? (
          <button
            type="button"
            disabled={busy}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60",
              className,
            )}
          >
            {label}
          </button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size={size}
            className={cn("rounded-xl", className)}
            disabled={busy}
          >
            {label}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem onClick={() => run(false)}>
          <Stamp className="h-4 w-4" />
          Avec signature électronique
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run(true)}>
          <PenLine className="h-4 w-4" />
          Sans signature — espace pour paraphe
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
