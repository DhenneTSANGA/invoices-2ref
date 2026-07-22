import { CABINET_LABELS, CABINET_LOGOS, type Cabinet } from "@/lib/cabinets";
import { cn } from "@/lib/utils";

type Props = {
  cabinet: Cabinet;
  className?: string;
  showLogo?: boolean;
};

export function CabinetBadge({ cabinet, className, showLogo = false }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {showLogo && (
        <img
          src={CABINET_LOGOS[cabinet]}
          alt=""
          className="h-3.5 w-auto object-contain"
        />
      )}
      {CABINET_LABELS[cabinet].replace(/^2R\s+/i, "")}
    </span>
  );
}
