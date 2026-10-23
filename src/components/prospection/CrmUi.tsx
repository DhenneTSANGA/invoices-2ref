import type { LucideIcon } from "lucide-react";
import {
  SELECT_CONTENT,
  SELECT_ITEM,
  SELECT_TRIGGER_STATE,
  SELECT_VIEWPORT,
  SelectChevron,
  SelectItemDecor,
} from "@/components/common/FancySelect";
import type { ReactNode } from "react";
import { Plus, Search, X } from "lucide-react";
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
        className={cn(CRM_FIELD, SELECT_TRIGGER_STATE, "flex w-full [&>span]:min-w-0 [&>span]:truncate", className)}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <SelectChevron />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className={SELECT_CONTENT}
          style={{ pointerEvents: "auto" }}
        >
          <SelectPrimitive.Viewport className={SELECT_VIEWPORT}>
            {emptyLabel ? (
              <SelectPrimitive.Item value={CRM_EMPTY} className={cn(SELECT_ITEM, "text-muted-foreground")}>
                <SelectItemDecor />
                <SelectPrimitive.ItemText>{emptyLabel}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ) : null}
            {items.map((item) => (
              <SelectPrimitive.Item key={item.value} value={item.value} className={SELECT_ITEM}>
                <SelectItemDecor />
                <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
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
  pending,
}: {
  onCancel: () => void;
  submitLabel: string;
  className?: string;
  /** Enregistrement en cours : bouton désactivé (pas de double soumission). */
  pending?: boolean;
}) {
  return (
    <div className={cn("flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end", className)}>
      <button type="button" onClick={onCancel} className={CRM_SECONDARY_BTN}>
        Annuler
      </button>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={cn(CRM_PRIMARY_BTN, "disabled:cursor-wait disabled:opacity-60")}
      >
        <Plus className="h-4 w-4" />
        {pending ? "Enregistrement…" : submitLabel}
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
