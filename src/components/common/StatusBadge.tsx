import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/store/types";

const map: Record<DocumentStatus | "default", { label: string; cls: string; dot: string }> = {
  draft: {
    label: "Brouillon",
    cls: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    dot: "bg-slate-400",
  },
  sent: {
    label: "Envoyé",
    cls: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    dot: "bg-sky-500",
  },
  accepted: {
    label: "Accepté",
    cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Refusé",
    cls: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    dot: "bg-orange-500",
  },
  paid: {
    label: "Payé",
    cls: "bg-green-50 text-green-700 ring-1 ring-green-300",
    dot: "bg-green-600",
  },
  overdue: {
    label: "En retard",
    cls: "bg-red-50 text-red-700 ring-1 ring-red-200",
    dot: "bg-red-500",
  },
  cancelled: {
    label: "Annulé",
    cls: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    dot: "bg-rose-500",
  },
  archived: {
    label: "Archivé",
    cls: "bg-muted text-muted-foreground ring-1 ring-border",
    dot: "bg-muted-foreground",
  },
  default: {
    label: "—",
    cls: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export function statusLabel(status: DocumentStatus): string {
  return (map[status] ?? map.default).label;
}

const onRowCls =
  "bg-white/20 text-white ring-1 ring-white/30 [&_span:first-child]:bg-white";

export function StatusBadge({
  status,
  className,
  variant = "default",
}: {
  status: DocumentStatus;
  className?: string;
  variant?: "default" | "onRow";
}) {
  const m = map[status] ?? map.default;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        variant === "onRow" ? onRowCls : m.cls,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", variant === "onRow" ? undefined : m.dot)} />
      {m.label}
    </span>
  );
}
