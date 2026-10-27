import { Plus, X } from "lucide-react";
import {
  MAX_CLIENT_EMAILS,
  type ClientEmailContact,
  type EmailCivility,
} from "@/lib/client-emails";
import { cn } from "@/lib/utils";

type Props = {
  value: ClientEmailContact[];
  onChange: (next: ClientEmailContact[]) => void;
};

const FIELD =
  "w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition";

const CIVILITIES: { value: EmailCivility; label: string }[] = [
  { value: "Monsieur", label: "M." },
  { value: "Madame", label: "Mme" },
];

/**
 * Adresses e-mail supplémentaires du client (bouton « Ajouter », 3 au total).
 * Civilité + nom : les mails envoyés à cette adresse commencent par
 * « Bonjour Madame … » ou « Bonjour Monsieur … ».
 */
export function ClientExtraEmails({ value, onChange }: Props) {
  const canAdd = value.length < MAX_CLIENT_EMAILS - 1;
  const patch = (index: number, next: Partial<ClientEmailContact>) =>
    onChange(value.map((c, i) => (i === index ? { ...c, ...next } : c)));

  return (
    <div className="sm:col-span-2 space-y-3">
      <p className="text-xs text-muted-foreground">
        L’email principal utilise la civilité et le représentant légal ci-dessus. Pour
        chaque autre adresse, indiquez à qui elle appartient : les mails lui seront
        adressés personnellement.
      </p>
      {value.map((contact, index) => (
        <div key={index} className="rounded-2xl border border-border/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Email {index + 2}
            </span>
            <button
              type="button"
              aria-label={`Retirer l’email ${index + 2}`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground hover:bg-muted hover:text-danger"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="email"
            value={contact.email}
            placeholder="autre.adresse@exemple.com"
            onChange={(e) => patch(index, { email: e.target.value })}
            className={cn(FIELD, "mt-2")}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex shrink-0 gap-1" role="radiogroup" aria-label="Civilité">
              {CIVILITIES.map((civ) => {
                const active = contact.civility === civ.value;
                return (
                  <button
                    key={civ.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => patch(index, { civility: active ? "" : civ.value })}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-medium transition",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:bg-muted",
                    )}
                  >
                    {civ.label}
                  </button>
                );
              })}
            </div>
            <input
              value={contact.name}
              placeholder="Nom (ex. Nzé) — optionnel"
              onChange={(e) => patch(index, { name: e.target.value })}
              className={cn(FIELD, "min-w-0 flex-1 basis-40")}
            />
          </div>
        </div>
      ))}
      {canAdd ? (
        <button
          type="button"
          onClick={() => onChange([...value, { email: "", civility: "", name: "" }])}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter une adresse e-mail
        </button>
      ) : (
        <p className="text-xs text-muted-foreground">
          {MAX_CLIENT_EMAILS} adresses e-mail maximum par client.
        </p>
      )}
    </div>
  );
}
