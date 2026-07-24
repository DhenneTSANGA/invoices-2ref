import { useState } from "react";
import { Banknote, Landmark, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/payment-method";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/store/types";

const ICONS: Record<PaymentMethod, typeof Wallet> = {
  cash: Wallet,
  check: Banknote,
  bank_transfer: Landmark,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentNumber?: string;
  pending?: boolean;
  onConfirm: (method: PaymentMethod) => void;
};

export function MarkAsPaidDialog({
  open,
  onOpenChange,
  documentNumber,
  pending,
  onConfirm,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) setMethod(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Marquer comme payée</DialogTitle>
          <DialogDescription>
            {documentNumber
              ? `Indiquez comment le client a réglé ${documentNumber}.`
              : "Indiquez le moyen de règlement du client."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-1">
          {PAYMENT_METHODS.map((value) => {
            const Icon = ICONS[value];
            const selected = method === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMethod(value)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                  selected
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-border bg-surface hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    selected
                      ? "bg-gradient-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">
                  {PAYMENT_METHOD_LABELS[value]}
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!method || pending}
            onClick={() => method && onConfirm(method)}
            className="rounded-2xl bg-gradient-success px-4 py-2 text-sm font-medium text-success-foreground shadow disabled:opacity-60"
          >
            {pending ? "Enregistrement…" : "Confirmer le paiement"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
