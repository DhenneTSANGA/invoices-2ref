import { CABINET_SCOPE_OPTIONS, type CabinetScope } from "@/lib/cabinets";
import { cn } from "@/lib/utils";

type Props = {
  value: CabinetScope;
  onChange: (value: CabinetScope) => void;
  className?: string;
};

export function CabinetFilter({ value, onChange, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {CABINET_SCOPE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-2xl px-3.5 py-1.5 text-sm font-medium transition-colors",
            value === opt.value
              ? "bg-gradient-primary text-primary-foreground shadow-glow"
              : "border border-border bg-surface hover:bg-muted",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
