import { useState } from "react";
import { Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clampSubscriptionDay } from "@/lib/subscription";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentNumber?: string;
  initialDay?: number | null;
  pending?: boolean;
  onConfirm: (dayOfMonth: number) => void;
};

export function SubscriptionDialog({
  open,
  onOpenChange,
  documentNumber,
  initialDay,
  pending,
  onConfirm,
}: Props) {
  const [day, setDay] = useState(String(initialDay ?? 1));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDay(String(initialDay ?? 1));
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display inline-flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            Facture d’abonnement
          </DialogTitle>
          <DialogDescription>
            {documentNumber
              ? `${documentNumber} sera générée et envoyée chaque mois à la date choisie. Vous pourrez toujours modifier les lignes de désignation.`
              : "Choisissez le jour d’envoi mensuel."}
          </DialogDescription>
        </DialogHeader>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Jour du mois (1–28)
          </span>
          <input
            type="number"
            min={1}
            max={28}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              onConfirm(clampSubscriptionDay(Number(day) || 1))
            }
            className="rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {pending ? "Activation…" : "Activer l’abonnement"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
