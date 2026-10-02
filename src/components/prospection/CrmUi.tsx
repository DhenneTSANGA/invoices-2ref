import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const CRM_FIELD =
  "w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

export function CrmLabeledField({
  label,
  children,
  className,
  required,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("block space-y-1.5", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </span>
      {children}
    </div>
  );
}

const CRM_EMPTY = "__crm_empty__";

/** Tant qu’une liste est ouverte, un clic à côté ne doit fermer que la liste. */
let crmSelectGuardUntil = 0;

function noteCrmSelectOpen(open: boolean) {
  if (!open) crmSelectGuardUntil = Date.now() + 400;
}

function crmSelectBlocksDialogClose() {
  const menuOpen = !!document.querySelector("[role='listbox'][data-state='open']");
  return menuOpen || Date.now() < crmSelectGuardUntil;
}

export type CrmSelectOption = string | { value: string; label: string };

/** Liste déroulante stylée : le menu natif du navigateur ne se laisse pas habiller. */
export function CrmSelect({
  value,
  onChange,
  placeholder = "Choisir",
  options,
  emptyLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options: readonly CrmSelectOption[];
  /** Option qui remet le champ à vide, affichée en tête de liste. */
  emptyLabel?: string;
  className?: string;
}) {
  const items = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );
  const current = value === "" && emptyLabel ? CRM_EMPTY : value || undefined;

  return (
    <SelectPrimitive.Root
      value={current}
      onValueChange={(next) => onChange(next === CRM_EMPTY ? "" : next)}
      onOpenChange={noteCrmSelectOpen}
    >
      <SelectPrimitive.Trigger
        className={cn(
          CRM_FIELD,
          "group flex cursor-pointer items-center justify-between gap-2 text-left data-[placeholder]:text-muted-foreground data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/20 [&>span]:min-w-0 [&>span]:truncate",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition group-data-[state=open]:bg-primary/10 group-data-[state=open]:text-primary">
            <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </span>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="z-[80] max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-border/70 bg-popover text-popover-foreground shadow-float data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{ pointerEvents: "auto" }}
        >
          <SelectPrimitive.Viewport className="max-h-64 overflow-y-auto overscroll-contain p-1.5 [scrollbar-color:color-mix(in_oklch,var(--primary)_40%,transparent)_transparent] [scrollbar-width:thin]">
            {emptyLabel ? (
              <SelectPrimitive.Item
                value={CRM_EMPTY}
                className="relative flex cursor-pointer select-none items-center rounded-xl py-2.5 pl-3 pr-9 text-sm text-muted-foreground outline-none data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[state=checked]:bg-primary/10 data-[state=checked]:font-medium data-[state=checked]:text-primary"
              >
                <SelectPrimitive.ItemText>{emptyLabel}</SelectPrimitive.ItemText>
                <span className="absolute right-2.5 flex h-4 w-4 items-center justify-center text-primary">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </SelectPrimitive.ItemIndicator>
                </span>
              </SelectPrimitive.Item>
            ) : null}
            {items.map((item) => (
              <SelectPrimitive.Item
                key={item.value}
                value={item.value}
                className="relative flex cursor-pointer select-none items-center rounded-xl py-2.5 pl-3 pr-9 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[state=checked]:bg-primary/10 data-[state=checked]:font-semibold data-[state=checked]:text-primary"
              >
                <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
                <span className="absolute right-2.5 flex h-4 w-4 items-center justify-center text-primary">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </SelectPrimitive.ItemIndicator>
                </span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
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
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition duration-150 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-float active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60";

export const CRM_SECONDARY_BTN =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60";

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
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && crmSelectBlocksDialogClose()) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        onPointerDownOutside={(event) => {
          if (crmSelectBlocksDialogClose()) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (crmSelectBlocksDialogClose()) event.preventDefault();
        }}
        onFocusOutside={(event) => {
          if (crmSelectBlocksDialogClose()) event.preventDefault();
        }}
        className={cn(
          "block max-h-[92vh] overflow-y-auto overscroll-contain border-border/60 p-0 sm:rounded-3xl [&>button]:text-primary-foreground [&>button]:opacity-90 [&>button]:hover:opacity-100",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
          className,
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
  className,
}: {
  onCancel: () => void;
  submitLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end", className)}>
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
        "cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        active
          ? "bg-gradient-primary text-primary-foreground shadow-glow hover:brightness-110 hover:shadow-float"
          : "bg-muted/70 text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-md hover:ring-1 hover:ring-primary/35",
      )}
    >
      {children}
    </button>
  );
}

/** Comparaison insensible aux accents et à la casse. */
export function foldSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function matchesSearch(query: string, ...parts: Array<string | number | null | undefined>) {
  const q = foldSearch(query.trim());
  if (!q) return true;
  return foldSearch(parts.filter((part) => part != null && part !== "").join(" ")).includes(q);
}

export function CrmSearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="glass-panel mb-4 rounded-2xl p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="w-full rounded-xl border border-border/60 bg-transparent py-2.5 pl-10 pr-10 text-sm focus:border-primary focus:outline-none"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Effacer la recherche"
            className="crm-quiet-hit absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function CrmSearchEmpty({
  title,
  description,
  onClear,
}: {
  title: string;
  description: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={Search}
      title={title}
      description={description}
      action={
        onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
          >
            Effacer la recherche
          </button>
        ) : null
      }
    />
  );
}
