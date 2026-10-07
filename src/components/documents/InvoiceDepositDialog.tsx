import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { currency } from "@/lib/format";
import { normalizedDeposit, remainingDue } from "@/lib/document-math";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentNumber?: string;
  total: number;
  currentDeposit?: number;
  pending?: boolean;
  /** Nouveau total des avances (XAF). */
  onConfirm: (deposit: number) => void;
};

export function InvoiceDepositDialog({
  open,
  onOpenChange,
  documentNumber,
  total,
  currentDeposit,
  pending,
  onConfirm,
}: Props) {
  const current = normalizedDeposit(currentDeposit);
  const [mode, setMode] = useState<"add" | "set">("add");
  const [raw, setRaw] = useState("");

  useEffect(() => {
    if (!open) {
      setMode("add");
      setRaw("");
    }
  }, [open]);

  const amount = Math.max(0, Math.round(Number(raw.replace(/\s/g, "").replace(",", ".")) || 0));
  const nextDeposit = mode === "add" ? current + amount : amount;
  const tooHigh = nextDeposit > Math.round(total);
  const unchanged = nextDeposit === current;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "add" ? "Enregistrer une avance" : "Corriger le total des avances"}
          </DialogTitle>
          <DialogDescription>
            {documentNumber
              ? `Avance du client sur ${documentNumber} (envoyée par e-mail ou déposée physiquement). Le contenu de la facture n’est pas modifié.`
              : "Avance du client. Le contenu de la facture n’est pas modifié."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="Montant facture" value={currency(total)} />
          <Stat label="Déjà avancé" value={currency(current)} />
          <Stat label="Reste à payer" value={currency(remainingDue(total, current))} />
        </div>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {mode === "add" ? "Montant reçu (XAF)" : "Total des avances (XAF)"}
          </span>
          <input
            autoFocus
            inputMode="numeric"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="0"
            className="mt-1 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-right font-numeric text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <div className="rounded-xl bg-muted/60 px-3 py-2 text-xs">
          Après enregistrement : avances {currency(nextDeposit)} · reste à payer{" "}
          <span className="font-semibold">{currency(remainingDue(total, nextDeposit))}</span>
          {tooHigh ? (
            <div className="mt-1 text-danger">L’avance dépasse le montant de la facture.</div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "add" ? "set" : "add");
            setRaw("");
          }}
          className="self-start text-xs text-primary hover:underline"
        >
          {mode === "add" ? "Corriger le total des avances" : "Ajouter une nouvelle avance"}
        </button>

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
            disabled={pending || tooHigh || unchanged}
            onClick={() => onConfirm(nextDeposit)}
            className="rounded-2xl bg-gradient-success px-4 py-2 text-sm font-medium text-success-foreground shadow disabled:opacity-60"
          >
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-numeric font-semibold">{value}</div>
    </div>
  );
}
