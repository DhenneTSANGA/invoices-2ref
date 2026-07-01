import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/store/types";

const map: Record<DocumentStatus | "default", { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-muted text-muted-foreground" },
  sent: { label: "Envoyé", cls: "bg-primary/10 text-primary" },
  accepted: { label: "Accepté", cls: "bg-success/15 text-success" },
  rejected: { label: "Refusé", cls: "bg-danger/15 text-danger" },
  paid: { label: "Payé", cls: "bg-success/15 text-success" },
  overdue: { label: "En retard", cls: "bg-danger/15 text-danger" },
  archived: { label: "Archivé", cls: "bg-muted text-muted-foreground" },
  default: { label: "—", cls: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  const m = map[status] ?? map.default;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", m.cls, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {m.label}
    </span>
  );
}
