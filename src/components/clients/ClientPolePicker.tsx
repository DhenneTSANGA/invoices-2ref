import type { ReactNode } from "react";
import {
  CLIENT_POLE_HINTS,
  CLIENT_POLE_LABELS,
  CLIENT_POLES,
  type ClientPole,
} from "@/lib/client-pole";
import { cn } from "@/lib/utils";

export function ClientPolePicker({
  value,
  onChange,
  compact = false,
}: {
  value: ClientPole | null;
  onChange: (v: ClientPole) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-2" : "col-span-full space-y-2"}>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Pôle <span className="text-danger">*</span>
      </div>
      <div
        className={cn(
          "grid gap-2",
          compact
            ? "grid-cols-2 sm:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {CLIENT_POLES.map((pole) => {
          const active = value === pole;
          return (
            <button
              key={pole}
              type="button"
              onClick={() => onChange(pole)}
              className={cn(
                "rounded-2xl border px-3 text-left transition",
                compact ? "py-2" : "py-3",
                active
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                  : "border-border/60 bg-surface hover:bg-muted",
              )}
            >
              <div className="text-sm font-semibold">
                {CLIENT_POLE_LABELS[pole]}
              </div>
              {!compact ? (
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {CLIENT_POLE_HINTS[pole]}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ClientPoleBadge({
  pole,
  className,
}: {
  pole: ClientPole | null | undefined;
  className?: string;
}) {
  if (!pole) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-200",
        className,
      )}
    >
      {CLIENT_POLE_LABELS[pole]}
    </span>
  );
}

export function PoleFilterChips({
  value,
  onChange,
}: {
  value: "all" | ClientPole;
  onChange: (v: "all" | ClientPole) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Pôle
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterChip active={value === "all"} onClick={() => onChange("all")}>
          Tous
        </FilterChip>
        {CLIENT_POLES.map((p) => (
          <FilterChip
            key={p}
            active={value === p}
            onClick={() => onChange(p)}
          >
            {CLIENT_POLE_LABELS[p]}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
          : "rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-muted"
      }
    >
      {children}
    </button>
  );
}
