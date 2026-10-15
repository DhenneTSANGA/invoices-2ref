import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useClients } from "@/hooks/use-data";
import { submitInternalLead } from "@/lib/internal-leads.functions";
import { SERVICE_LINE_LABELS, SERVICE_LINES, type ServiceLine } from "@/lib/prospection-model";

const FIELD =
  "mt-1 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition";

/**
 * Remontée d’une piste par n’importe quel collaborateur (cahier des charges §5) :
 * moins d’une minute, attribution automatique au manager référent.
 */
export function ReportLeadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: clients = [] } = useClients();
  const [companyName, setCompanyName] = useState("");
  const [line, setLine] = useState<ServiceLine | "">("");
  const [need, setNeed] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCompanyName("");
    setLine("");
    setNeed("");
    setComment("");
  }, [open]);

  const matchedClient = clients.find(
    (c) => c.name.trim().toLowerCase() === companyName.trim().toLowerCase(),
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !line || !need.trim()) {
      toast.error("Client, ligne de service et besoin sont requis");
      return;
    }
    setSaving(true);
    try {
      const res = await submitInternalLead({
        data: {
          companyName: companyName.trim(),
          clientId: matchedClient?.id,
          line,
          need: need.trim(),
          comment: comment.trim() || undefined,
        },
      });
      toast.success(`Piste transmise à ${res.ownerName}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Signaler une piste
          </DialogTitle>
          <DialogDescription>
            Un besoin repéré chez un client ? Il est transmis au manager référent.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Client ou entreprise
            </span>
            <input
              list="report-lead-clients"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nom du client"
              className={FIELD}
              autoFocus
            />
            <datalist id="report-lead-clients">
              {clients.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Ligne de service concernée
            </span>
            <select
              value={line}
              onChange={(e) => setLine(e.target.value as ServiceLine)}
              className={FIELD}
            >
              <option value="">Choisir…</option>
              {SERVICE_LINES.map((l) => (
                <option key={l} value={l}>
                  {SERVICE_LINE_LABELS[l]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Besoin détecté
            </span>
            <input
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              placeholder="Ex. restructuration de la paie, contrôle fiscal en cours"
              className={FIELD}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Précision (optionnel)
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className={FIELD}
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Envoi…" : "Envoyer la piste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
