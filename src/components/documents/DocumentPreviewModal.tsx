import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Document } from "@/store/types";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { DocumentPdfButton } from "@/components/documents/DocumentPdfButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PreviewPagination = {
  index: number;
  total: number;
  label: string;
  onPrev: () => void;
  onNext: () => void;
};

type Props = {
  doc: Document;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagination?: PreviewPagination;
};

export function DocumentPreviewModal({
  doc,
  open,
  onOpenChange,
  pagination,
}: Props) {
  useEffect(() => {
    if (!open || !pagination || pagination.total <= 1) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && pagination.index > 0) {
        e.preventDefault();
        pagination.onPrev();
      }
      if (e.key === "ArrowRight" && pagination.index < pagination.total - 1) {
        e.preventDefault();
        pagination.onNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, pagination]);

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
          <div className="flex flex-wrap items-center justify-end gap-3">
            <DocumentPdfButton
              doc={doc}
              size="sm"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            />
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
            <DocumentPreview key={doc.id} doc={doc} />
          </div>
        </div>

        {pagination && pagination.total > 1 ? (
          <div className="flex shrink-0 items-center justify-center gap-3 border-t border-white/10 bg-[#0F172A] px-4 py-3">
            <button
              type="button"
              className="rounded-lg p-1.5 text-white hover:bg-white/10 disabled:opacity-40"
              disabled={pagination.index <= 0}
              onClick={pagination.onPrev}
              aria-label="Aperçu précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-48 text-center text-sm text-white">
              <div className="text-[11px] text-white/60">
                Aperçu {pagination.index + 1}/{pagination.total}
              </div>
              <div className="truncate font-medium">{pagination.label}</div>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 text-white hover:bg-white/10 disabled:opacity-40"
              disabled={pagination.index >= pagination.total - 1}
              onClick={pagination.onNext}
              aria-label="Aperçu suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
