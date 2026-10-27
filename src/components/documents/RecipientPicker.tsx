import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

type PickerRequest = {
  clientName: string;
  documentNumber: string;
  emails: string[];
  /** Personne associée à chaque adresse (« Madame Nzé »), si renseignée. */
  labels?: Record<string, string>;
  resolve: (picked: string[] | null) => void;
};

let current: PickerRequest | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/**
 * Ouvre la fenêtre de choix des destinataires (adresses du client).
 * Résout avec les adresses cochées, ou null si l’envoi est annulé.
 */
export function pickRecipients(args: {
  clientName: string;
  documentNumber: string;
  emails: string[];
  labels?: Record<string, string>;
}): Promise<string[] | null> {
  current?.resolve(null);
  return new Promise((resolve) => {
    current = { ...args, resolve };
    emit();
  });
}

/** Monté une fois à la racine de l’application. */
export function RecipientPickerHost() {
  const [request, setRequest] = useState<PickerRequest | null>(current);
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    const listener = () => {
      setRequest(current);
      // Par défaut : l’adresse principale seule.
      setChecked(current ? current.emails.slice(0, 1) : []);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const close = (picked: string[] | null) => {
    request?.resolve(picked);
    current = null;
    setRequest(null);
  };

  const toggle = (email: string, on: boolean) =>
    setChecked((prev) =>
      on ? [...prev, email] : prev.filter((e) => e !== email),
    );

  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && close(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display inline-flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Destinataires
          </DialogTitle>
          <DialogDescription>
            {request
              ? `Cochez la ou les adresses de « ${request.clientName} » qui recevront ${request.documentNumber}. Chaque destinataire reçoit son propre e-mail, avec sa salutation.`
              : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {request?.emails.map((email, index) => (
            <label
              key={email}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 hover:bg-muted/50"
            >
              <Checkbox
                checked={checked.includes(email)}
                onCheckedChange={(v) => toggle(email, v === true)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{email}</span>
                {request.labels?.[email] ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {request.labels[email]}
                  </span>
                ) : null}
              </span>
              {index === 0 ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Principale
                </span>
              ) : null}
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => close(null)}
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={checked.length === 0}
            onClick={() =>
              close(request ? request.emails.filter((e) => checked.includes(e)) : null)
            }
            className="rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
          >
            Envoyer
            {checked.length > 1 ? ` à ${checked.length} adresses` : ""}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
