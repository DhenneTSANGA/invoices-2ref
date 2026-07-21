import type { DocumentStatus } from "@/store/types";
import { cn } from "@/lib/utils";

type RowStyles = {
  row: string;
  muted: string;
  select: string;
  actionBtn: string;
  viewLink: string;
};

const styles: Record<DocumentStatus | "default", RowStyles> = {
  draft: {
    row: "bg-slate-300 text-slate-900 hover:bg-slate-400",
    muted: "text-slate-700",
    select: "border-slate-400/60 bg-white text-slate-900",
    actionBtn: "text-slate-800 hover:bg-slate-500/30",
    viewLink: "bg-slate-900/15 text-slate-900 hover:bg-slate-900 hover:text-white",
  },
  sent: {
    row: "bg-sky-500 text-white hover:bg-sky-600",
    muted: "text-sky-100",
    select: "border-sky-300/60 bg-white text-slate-900",
    actionBtn: "text-white hover:bg-white/20",
    viewLink: "bg-white/20 text-white hover:bg-white hover:text-sky-700",
  },
  paid: {
    row: "bg-green-600 text-white hover:bg-green-700",
    muted: "text-green-100",
    select: "border-green-300/60 bg-white text-slate-900",
    actionBtn: "text-white hover:bg-white/20",
    viewLink: "bg-white/20 text-white hover:bg-white hover:text-green-700",
  },
  accepted: {
    row: "bg-green-600 text-white hover:bg-green-700",
    muted: "text-green-100",
    select: "border-green-300/60 bg-white text-slate-900",
    actionBtn: "text-white hover:bg-white/20",
    viewLink: "bg-white/20 text-white hover:bg-white hover:text-green-700",
  },
  overdue: {
    row: "bg-red-600 text-white hover:bg-red-700",
    muted: "text-red-100",
    select: "border-red-300/60 bg-white text-slate-900",
    actionBtn: "text-white hover:bg-white/20",
    viewLink: "bg-white/20 text-white hover:bg-white hover:text-red-700",
  },
  rejected: {
    row: "bg-orange-500 text-white hover:bg-orange-600",
    muted: "text-orange-100",
    select: "border-orange-300/60 bg-white text-slate-900",
    actionBtn: "text-white hover:bg-white/20",
    viewLink: "bg-white/20 text-white hover:bg-white hover:text-orange-700",
  },
  cancelled: {
    row: "bg-slate-400/70 text-slate-700 hover:bg-slate-400",
    muted: "text-slate-600",
    select: "border-slate-400/60 bg-white text-slate-900",
    actionBtn: "text-slate-700 hover:bg-slate-500/30",
    viewLink: "bg-slate-800/10 text-slate-800 hover:bg-slate-800 hover:text-white",
  },
  archived: {
    row: "bg-slate-500 text-white hover:bg-slate-600",
    muted: "text-slate-200",
    select: "border-slate-300/60 bg-white text-slate-900",
    actionBtn: "text-white hover:bg-white/20",
    viewLink: "bg-white/20 text-white hover:bg-white hover:text-slate-700",
  },
  default: {
    row: "bg-muted text-foreground hover:bg-muted/80",
    muted: "text-muted-foreground",
    select: "border-border/60 bg-surface text-foreground",
    actionBtn: "text-foreground hover:bg-muted",
    viewLink: "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground",
  },
};

export function getDocumentRowStyles(status: DocumentStatus): RowStyles {
  return styles[status] ?? styles.default;
}

export function documentRowClass(status: DocumentStatus, className?: string): string {
  return cn("border-t border-black/5 transition-colors", styles[status]?.row ?? styles.default.row, className);
}
