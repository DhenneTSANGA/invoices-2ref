import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const CRM_FIELD =
  "w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

export function CrmLabeledField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** CTA de vente croisée — distinct du badge « Acheté ». */
export function ProposeLineButton({
  onClick,
  lineLabel,
}: {
  onClick: () => void;
  lineLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Créer une opportunité ${lineLabel}`}
      aria-label={`Créer une opportunité ${lineLabel}`}
      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-amber-950 shadow-sm ring-1 ring-amber-600/30 transition hover:-translate-y-0.5 hover:bg-amber-400 hover:shadow-md"
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
      À proposer
    </button>
  );
}

export const CRM_PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow";

export const CRM_SECONDARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted";

export function CrmPrimaryButton({
  children,
  onClick,
  type = "button",
  icon: Icon = Plus,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  icon?: LucideIcon | null;
}) {
  return (
    <button type={type} onClick={onClick} className={CRM_PRIMARY_BTN}>
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function CrmSecondaryButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} onClick={onClick} className={CRM_SECONDARY_BTN}>
      {children}
    </button>
  );
}

export function CrmDialog({
  open,
  onOpenChange,
  icon: Icon,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[92vh] overflow-y-auto border-border/60 p-0 sm:rounded-3xl [&>button]:text-primary-foreground [&>button]:opacity-90 [&>button]:hover:opacity-100",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <div className="relative overflow-hidden bg-gradient-primary px-6 py-6 text-primary-foreground">
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Icon className="h-5 w-5" />
            </span>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="font-display text-xl text-primary-foreground">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="text-primary-foreground/80">
                  {description}
                </DialogDescription>
              ) : null}
            </DialogHeader>
          </div>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function CrmFormActions({
  onCancel,
  submitLabel,
}: {
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} className={CRM_SECONDARY_BTN}>
        Annuler
      </button>
      <button type="submit" className={CRM_PRIMARY_BTN}>
        <Plus className="h-4 w-4" />
        {submitLabel}
      </button>
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
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-gradient-primary text-primary-foreground shadow-glow"
          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
