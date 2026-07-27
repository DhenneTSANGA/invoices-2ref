import { Download, Mail, FileDown } from "lucide-react";
import { useDocumentPdfTraces } from "@/hooks/use-data";
import { shortDate } from "@/lib/format";

export function DocumentPdfTracesPanel({ documentId }: { documentId: string }) {
  const { data: traces = [], isLoading } = useDocumentPdfTraces(documentId);

  if (isLoading) {
    return (
      <div className="glass-panel rounded-3xl p-5 text-sm text-muted-foreground">
        Chargement des traces PDF…
      </div>
    );
  }

  if (traces.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-5">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Traces PDF
        </h4>
        <p className="mt-2 text-sm text-muted-foreground">
          Aucun PDF enregistré pour le moment. Un téléchargement ou un envoi créera une trace.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-3xl p-5">
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Traces PDF
      </h4>
      <ul className="mt-3 space-y-2">
        {traces.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface-2/50 px-3 py-2.5"
          >
            <span
              className={
                t.action === "email"
                  ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"
                  : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
              }
            >
              {t.action === "email" ? (
                <Mail className="h-4 w-4" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {t.action === "email" ? "Envoyé par e-mail" : "Téléchargé"}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {t.staffName} · {shortDate(t.createdAt)}
              </div>
            </div>
            <a
              href={t.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
              title={t.fileName}
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
