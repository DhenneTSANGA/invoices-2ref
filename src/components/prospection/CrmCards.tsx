import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CalendarDays,
  CheckSquare,
  Mail,
  MapPin,
  Phone,
  RotateCw,
  Sparkles,
  StickyNote,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { shortDate } from "@/lib/format";
import type { ActivityKind, PipelineStage } from "@/lib/prospection-demo";

const AVATAR_TONES = [
  "bg-gradient-primary text-primary-foreground shadow-glow",
  "bg-sky-600 text-white",
  "bg-violet-600 text-white",
  "bg-amber-500 text-white",
  "bg-emerald-600 text-white",
  "bg-fuchsia-600 text-white",
  "bg-indigo-600 text-white",
];

export const STAGE_ACCENT: Record<PipelineStage, string> = {
  qualification: "bg-sky-500",
  premier_contact: "bg-indigo-500",
  rendez_vous: "bg-amber-500",
  proposition: "bg-violet-500",
  negotiation: "bg-fuchsia-500",
  decision: "bg-orange-500",
  gagne: "bg-emerald-500",
  perdu: "bg-danger",
  reporte: "bg-muted-foreground",
};

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  appel: Phone,
  email: Mail,
  visite: MapPin,
  rdv: CalendarDays,
  relance: RotateCw,
  evenement: Sparkles,
  tache: CheckSquare,
  note: StickyNote,
};

const KIND_TONE: Record<ActivityKind, string> = {
  appel: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  email: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  visite: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  rdv: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  relance: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
  evenement: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  tache: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  note: "bg-muted text-muted-foreground",
};

export function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isOverdue(iso?: string | null) {
  return Boolean(iso && iso < isoToday());
}

export function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function toneFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function CrmCardGrid({
  children,
  dense,
}: {
  children: ReactNode;
  dense?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        dense ? "lg:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}

export function CrmCard({
  children,
  className,
  index = 0,
  accent,
  spotId,
  spotlight = false,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
  accent?: string;
  /** Identifiant utilisé pour retrouver la carte après une alerte. */
  spotId?: string;
  spotlight?: boolean;
}) {
  return (
    <motion.article
      data-spotlight={spotId}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 10) * 0.035, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative overflow-hidden rounded-[1.6rem] p-5 shadow-soft glass-panel transition-shadow hover:shadow-float",
        className,
        spotlight && "crm-spotlight",
      )}
    >
      {accent ? (
        <span className={cn("absolute inset-y-0 left-0 w-1.5", accent)} aria-hidden />
      ) : null}
      <div
        className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <div className={cn("relative", accent && "pl-1.5")}>{children}</div>
    </motion.article>
  );
}

export function EntityMark({
  name,
  className,
  size = "md",
}: {
  name: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl font-display font-bold tracking-tight",
        size === "sm" ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm",
        toneFor(name),
        className,
      )}
    >
      {initialsFrom(name)}
    </div>
  );
}

export function KindMark({ kind }: { kind: ActivityKind }) {
  const Icon = KIND_ICON[kind];
  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
        KIND_TONE[kind],
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

export function IconMark({
  icon: Icon,
  tone = "bg-primary/15 text-primary",
}: {
  icon: LucideIcon;
  tone?: string;
}) {
  return (
    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", tone)}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

export function DateTile({ iso }: { iso: string }) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const day = new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(date);
  return (
    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
      <span className="font-display text-lg font-bold leading-none">{day}</span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-85">{month}</span>
    </div>
  );
}

export function MetricTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-muted/45 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 truncate font-display text-sm font-semibold tabular-nums",
          accent && "text-primary",
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function ProgressMeter({
  value,
  label,
  hint,
}: {
  value: number;
  label?: string;
  hint?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const bar =
    clamped >= 80
      ? "bg-emerald-500"
      : clamped >= 50
        ? "bg-primary"
        : clamped >= 20
          ? "bg-amber-500"
          : "bg-muted-foreground/50";
  return (
    <div>
      {label || hint ? (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
          {label ? <span className="font-medium text-muted-foreground">{label}</span> : <span />}
          <span className="shrink-0 font-semibold tabular-nums">{hint ?? `${clamped} %`}</span>
        </div>
      ) : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export function ProbabilityMeter({ value }: { value: number }) {
  return <ProgressMeter value={value} label="Probabilité de signature" hint={`${value} %`} />;
}

export function NextActionRow({
  action,
  date,
  empty = "À planifier",
}: {
  action?: string | null;
  date?: string | null;
  empty?: string;
}) {
  const overdue = isOverdue(date);
  const has = Boolean(action);
  return (
    <div
      className={cn(
        "mt-4 flex items-start gap-2.5 rounded-2xl border px-3 py-2.5",
        overdue
          ? "border-danger/25 bg-danger/8"
          : has
            ? "border-primary/15 bg-primary/5"
            : "border-border/50 bg-muted/30",
      )}
    >
      <CalendarClock
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          overdue ? "text-danger" : has ? "text-primary" : "text-muted-foreground",
        )}
      />
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {overdue ? "Action en retard" : "Prochaine action"}
        </div>
        <div className="mt-0.5 text-sm font-medium leading-snug">{has ? action : empty}</div>
        {date ? (
          <div className={cn("mt-0.5 text-[11px]", overdue ? "font-semibold text-danger" : "text-muted-foreground")}>
            {shortDate(date)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
