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
import { Switch } from "@/components/ui/switch";
import { clampSubscriptionDay } from "@/lib/subscription";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentNumber?: string;
  initialDay?: number | null;
  initialShowDueMonth?: boolean;
  pending?: boolean;
  onConfirm: (payload: {
    dayOfMonth: number;
    showDueMonthOnLines: boolean;
  }) => void;
};

export function SubscriptionDialog({
  open,
  onOpenChange,
  documentNumber,
  initialDay,
  initialShowDueMonth,
  pending,
  onConfirm,
}: Props) {
  const [day, setDay] = useState(String(initialDay ?? 1));
  const [showDueMonth, setShowDueMonth] = useState(Boolean(initialShowDueMonth));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDay(String(initialDay ?? 1));
          setShowDueMonth(Boolean(initialShowDueMonth));
        }
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
              ? `${documentNumber} sera générée et envoyée chaque mois à la date choisie (échéance selon le modèle). La facture doit déjà être signée et envoyée.`
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

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 px-3 py-2.5">
          <Switch
            checked={showDueMonth}
            onCheckedChange={setShowDueMonth}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium">
              Mentionner le mois d’échéance sous les désignations
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Ajoute une ligne « Échéances du mois de septembre » sous le
              tableau. Optionnel, repris sur les factures générées chaque mois.
            </span>
          </span>
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
              onConfirm({
                dayOfMonth: clampSubscriptionDay(Number(day) || 1),
                showDueMonthOnLines: showDueMonth,
              })
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
