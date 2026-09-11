import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function SuggestibleTextInput({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Rechercher…",
  groupHeading = "Suggestions",
  triggerTitle = "Choisir dans la liste",
  inputClassName,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  searchPlaceholder?: string;
  groupHeading?: string;
  triggerTitle?: string;
  inputClassName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...options];
    return options.filter((t) => t.toLowerCase().includes(q));
  }, [options, query]);

  const exactMatch = options.some(
    (t) => t.toLowerCase() === query.trim().toLowerCase(),
  );
  const canUseCustom = query.trim().length > 0 && !exactMatch;

  return (
    <div className={cn("flex min-w-0 flex-1 items-stretch gap-1", className)}>
      <input
        className={cn(
          "min-w-0 flex-1 rounded-lg border border-border/60 bg-surface px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none",
          inputClassName,
        )}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            title={triggerTitle}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border/60 bg-surface px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={triggerTitle}
          >
            <ChevronsUpDown className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(100vw-2rem,22rem)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {canUseCustom ? (
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      onChange(query.trim());
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    Utiliser « {query.trim()} »
                  </button>
                ) : (
                  <span className="text-muted-foreground">Aucun résultat</span>
                )}
              </CommandEmpty>
              <CommandGroup heading={groupHeading}>
                {filtered.map((title) => (
                  <CommandItem
                    key={title}
                    value={title}
                    onSelect={() => {
                      onChange(title);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === title ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="text-sm">{title}</span>
                  </CommandItem>
                ))}
                {canUseCustom && filtered.length > 0 ? (
                  <CommandItem
                    value={`__custom__${query.trim()}`}
                    onSelect={() => {
                      onChange(query.trim());
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="text-sm text-muted-foreground">
                      Utiliser « {query.trim()} »
                    </span>
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
