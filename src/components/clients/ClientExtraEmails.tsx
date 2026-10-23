import { Plus, X } from "lucide-react";
import { MAX_CLIENT_EMAILS } from "@/lib/client-emails";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

/** Adresses e-mail supplémentaires du client (bouton « Ajouter », 3 au total). */
export function ClientExtraEmails({ value, onChange }: Props) {
  const canAdd = value.length < MAX_CLIENT_EMAILS - 1;

  return (
    <div className="sm:col-span-2 space-y-2">
      {value.map((email, index) => (
        <label key={index} className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Email {index + 2}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="email"
              value={email}
              placeholder="autre.adresse@exemple.com"
              onChange={(e) =>
                onChange(value.map((v, i) => (i === index ? e.target.value : v)))
              }
              className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
            <button
              type="button"
              aria-label={`Retirer l’email ${index + 2}`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground hover:bg-muted hover:text-danger"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </label>
      ))}
      {canAdd ? (
        <button
          type="button"
          onClick={() => onChange([...value, ""])}
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
