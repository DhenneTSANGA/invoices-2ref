import { useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { Document } from "@/store/types";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { downloadDocumentPdf } from "@/lib/pdf/downloadDocumentPdf";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  doc: Document;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DocumentPreviewModal({ doc, open, onOpenChange }: Props) {
  const [exporting, setExporting] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed inset-0 left-0 top-0 z-50 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-[#0F172A]/90 p-0 shadow-none sm:rounded-none data-[state=open]:zoom-in-100 [&>button]:hidden"
      >
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 border-b border-white/10 bg-[#0F172A] px-4 py-3 text-left">
          <div>
            <DialogTitle className="font-display text-base text-white">
              Aperçu — {doc.number}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Visualisation plein écran du document
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              disabled={exporting}
              onClick={downloadPdf}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
              Fermer
            </Button>
          </div>
        </DialogHeader>

        <div
          className="flex-1 overflow-auto bg-[#94A3B8]/30 p-4 sm:p-8"
          onClick={() => onOpenChange(false)}
          role="presentation"
        >
          <div
            className="mx-auto w-full max-w-[900px]"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <DocumentPreview doc={doc} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
