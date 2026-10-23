import {
  Children,
  Fragment,
  isValidElement,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Menu déroulant de l’application (Facturation et Prospection) : même usage qu’un
 * `<select>` natif (`value`, `onChange(e)`, `<option>` en enfants), mais une liste
 * habillée — le menu natif du navigateur ne se laisse pas styliser.
 */

/** Styles partagés avec les autres menus (CrmSelect de la Prospection). */
export const SELECT_TRIGGER_STATE =
  "group inline-flex cursor-pointer items-center justify-between gap-2 text-left outline-none transition hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 data-[placeholder]:text-muted-foreground data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

export const SELECT_CONTENT =
  "z-[90] min-w-[var(--radix-select-trigger-width)] max-w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border/60 bg-popover/95 text-popover-foreground shadow-float ring-1 ring-black/5 backdrop-blur-xl dark:ring-white/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2";

export const SELECT_VIEWPORT =
  "max-h-[min(20rem,var(--radix-select-content-available-height))] overflow-y-auto overscroll-contain p-1.5 [scrollbar-color:color-mix(in_oklch,var(--primary)_40%,transparent)_transparent] [scrollbar-width:thin]";

export const SELECT_ITEM =
  "group/item relative flex cursor-pointer select-none items-center gap-2.5 rounded-xl py-2.5 pl-3 pr-9 text-sm outline-none transition-colors data-[highlighted]:bg-primary/[0.08] data-[state=checked]:bg-primary/10 data-[state=checked]:font-semibold data-[state=checked]:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-45";

export function SelectChevron() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground transition group-hover:text-foreground group-data-[state=open]:bg-primary/10 group-data-[state=open]:text-primary">
      <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
    </span>
  );
}

/** Pastille à gauche et coche à droite d’une option. */
export function SelectItemDecor() {
  return (
    <>
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-border transition-colors group-data-[highlighted]/item:bg-primary/60 group-data-[state=checked]/item:bg-primary"
      />
      <span className="absolute right-2.5 flex h-5 w-5 items-center justify-center">
        <SelectPrimitive.ItemIndicator className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Check className="h-3 w-3" strokeWidth={3} />
        </SelectPrimitive.ItemIndicator>
      </span>
    </>
  );
}

const EMPTY = "__fancy_select_empty__";

type Option = { value: string; label: ReactNode; disabled?: boolean };

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
  return "";
}

function collectOptions(children: ReactNode, out: Option[]) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode; value?: unknown; disabled?: boolean }>;
    if (el.type === Fragment || el.type === "optgroup") {
      collectOptions(el.props.children, out);
      return;
    }
    if (el.type === "option") {
      const value = el.props.value != null ? String(el.props.value) : textOf(el.props.children);
      out.push({ value, label: el.props.children, disabled: el.props.disabled });
    }
  });
}

type FancySelectProps = {
  value?: string | number | null;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  title?: string;
  placeholder?: string;
  "aria-label"?: string;
};

export function FancySelect({
  value,
  onChange,
  children,
  className,
  disabled,
  required,
  name,
  id,
  title,
  placeholder = "Choisir",
  "aria-label": ariaLabel,
}: FancySelectProps) {
  const options: Option[] = [];
  collectOptions(children, options);
  const raw = value == null ? "" : String(value);
  const toRadix = (v: string) => (v === "" ? EMPTY : v);

  return (
    <SelectPrimitive.Root
      value={options.some((o) => o.value === raw) ? toRadix(raw) : undefined}
      onValueChange={(next) => {
        const v = next === EMPTY ? "" : next;
        // Même forme qu’un événement natif : les gestionnaires lisent e.target.value.
        const target = { value: v, name } as HTMLSelectElement;
        onChange?.({ target, currentTarget: target } as ChangeEvent<HTMLSelectElement>);
      }}
      disabled={disabled}
      required={required}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        title={title}
        aria-label={ariaLabel}
        className={cn(SELECT_TRIGGER_STATE, className)}
      >
        <span className="min-w-0 flex-1 truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <SelectChevron />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={6} collisionPadding={12} className={SELECT_CONTENT}>
          <SelectPrimitive.Viewport className={SELECT_VIEWPORT}>
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={toRadix(o.value)}
                disabled={o.disabled}
                className={SELECT_ITEM}
              >
                <SelectItemDecor />
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
