import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import {
  getInvoiceProspectionContext,
  setInvoicePaidAt,
  setInvoiceProspectionManager,
} from "@/lib/billing-prospection.functions";

import { FancySelect } from "@/components/common/FancySelect";
export const invoiceProspectionKey = ["invoice-prospection-context"] as const;

/** Managers Prospection du cabinet actif et suggestions par client (fiche Prospection reliée). */
export function useInvoiceProspectionContext() {
  return useQuery({
    queryKey: invoiceProspectionKey,
    queryFn: () => getInvoiceProspectionContext(),
    staleTime: 5 * 60_000,
  });
}

const SELECT_CLASS =
  "mt-1 w-full min-w-0 truncate rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition disabled:opacity-60";

/** Champ facultatif de l’éditeur : manager Prospection qui a apporté la facture. */
export function InvoiceProspectionManagerPicker({
  value,
  suggested,
  onChange,
}: {
  value?: string | null;
  /** Manager de la fiche Prospection reliée au client, s’il y en a une. */
  suggested?: string | null;
  onChange: (managerId: string | null) => void;
}) {
  const { data, isPending } = useInvoiceProspectionContext();
  const managers = data?.managers ?? [];
  if (!isPending && managers.length === 0) return null;
  return (
    <label className="block min-w-0">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Manager apporteur (optionnel)
      </span>
      <FancySelect
        className={SELECT_CLASS}
        value={value ?? ""}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Aucun</option>
        {managers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {suggested === m.id ? " (fiche Prospection)" : ""}
          </option>
        ))}
      </FancySelect>
      <span className="mt-1 block text-[11px] text-muted-foreground">
        L’encaissement de cette facture sera compté pour ce manager dans l’espace Prospection.
      </span>
    </label>
  );
}

/** Page détail : manager apporteur, modifiable par un administrateur même sur une facture figée. */
export function InvoiceProspectionManagerControl({
  invoiceId,
  managerId,
  canEdit,
  onSaved,
}: {
  invoiceId: string;
  managerId?: string | null;
  canEdit: boolean;
  onSaved?: () => void;
}) {
  const qc = useQueryClient();
  const { data } = useInvoiceProspectionContext();
  const [value, setValue] = useState<string | null>(managerId ?? null);
  const [saving, setSaving] = useState(false);
  const managers = data?.managers ?? [];
  if (managers.length === 0) return null;
  const current = managers.find((m) => m.id === value);

  if (!canEdit) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Target className="h-4 w-4" aria-hidden />
        Manager apporteur : <span className="font-medium text-foreground">{current?.name ?? "aucun"}</span>
      </p>
    );
  }

  return (
    <label className="inline-flex flex-wrap items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Target className="h-4 w-4" aria-hidden />
        Manager apporteur
      </span>
      <FancySelect
        className="rounded-xl border border-border/60 bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        value={value ?? ""}
        disabled={saving}
        onChange={(e) => {
          const next = e.target.value || null;
          const previous = value;
          setValue(next);
          setSaving(true);
          void setInvoiceProspectionManager({ data: { id: invoiceId, managerId: next } })
            .then(() => {
              toast.success(
                next ? `Manager apporteur : ${managers.find((m) => m.id === next)?.name}` : "Manager apporteur retiré",
              );
              void qc.invalidateQueries({ queryKey: ["crm-team-pulse"] });
              onSaved?.();
            })
            .catch((err) => {
              setValue(previous);
              toast.error(err instanceof Error ? err.message : "Modification impossible");
            })
            .finally(() => setSaving(false));
        }}
      >
        <option value="">Aucun</option>
        {managers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </FancySelect>
      {saving ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
    </label>
  );
}

/** Page détail d’une facture payée : date d’encaissement, modifiable par un administrateur. */
export function InvoicePaidAtControl({
  invoiceId,
  paidAt,
  canEdit,
}: {
  invoiceId: string;
  paidAt?: string | null;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState(paidAt ? paidAt.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const label = value
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
        new Date(`${value}T12:00:00.000Z`),
      )
    : "—";

  if (!canEdit) {
    return (
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Encaissée le</span>
        <span className="font-medium">{label}</span>
      </div>
    );
  }

  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">Encaissée le</span>
      <span className="inline-flex items-center gap-1.5">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
        <input
          type="date"
          value={value}
          max={new Date().toISOString().slice(0, 10)}
          disabled={saving}
          onChange={(e) => {
            const next = e.target.value;
            if (!next) return;
            const previous = value;
            setValue(next);
            setSaving(true);
            void setInvoicePaidAt({ data: { id: invoiceId, paidAt: next } })
              .then(() => {
                toast.success("Date d’encaissement mise à jour");
                void qc.invalidateQueries({ queryKey: ["crm-team-pulse"] });
              })
              .catch((err) => {
                setValue(previous);
                toast.error(err instanceof Error ? err.message : "Modification impossible");
              })
              .finally(() => setSaving(false));
          }}
          className="rounded-lg border border-border/60 bg-surface px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        />
      </span>
    </label>
  );
}
