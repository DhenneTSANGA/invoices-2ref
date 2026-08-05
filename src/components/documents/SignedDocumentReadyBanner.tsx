import { CheckCircle2, Mail, Printer, Clock } from "lucide-react";
import type { DocumentType } from "@/store/types";

const typeLabel: Record<"invoice" | "quotation" | "letter", string> = {
  invoice: "La facture",
  quotation: "Le devis",
  letter: "Le courriel",
};

/** Bandeau affiché tant que le document est signé et pas encore envoyé. */
export function SignedDocumentReadyBanner({
  type,
}: {
  type: DocumentType | string;
}) {
  if (type !== "invoice" && type !== "quotation" && type !== "letter") return null;
  const label = typeLabel[type];

  return (
    <div className="mb-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-semibold text-emerald-900 dark:text-emerald-100">
            {label} est signé(e)
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-emerald-900/80 dark:text-emerald-100/80">
            Vous pouvez l’envoyer par e-mail, télécharger ou imprimer le PDF, ou le
            conserver tel quel pour un envoi ultérieur. Aucune action automatique n’a
            été effectuée après la signature.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
            <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1">
              <Mail className="h-3 w-3" /> Envoyer
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1">
              <Printer className="h-3 w-3" /> PDF / Imprimer
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1">
              <Clock className="h-3 w-3" /> Conserver pour plus tard
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
