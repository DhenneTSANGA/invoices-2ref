import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useClients, useDocuments } from "@/hooks/use-data";
import {
  FileText,
  ReceiptText,
  Users,
  LayoutDashboard,
  Archive,
  Package,
  Mails,
  Files,
  Mail,
  Sparkles,
  FolderOpen,
  ArrowRight,
  Command,
} from "lucide-react";
import { documentTypeLabel } from "@/lib/document-status-labels";
import { CABINET_LABELS } from "@/lib/cabinets";
import { cn } from "@/lib/utils";
import type { Document } from "@/store/types";

type QuickAction = {
  label: string;
  hint: string;
  path: string;
  icon: LucideIcon;
  iconClass: string;
  keywords: string;
};

type NavAction = {
  label: string;
  path: string;
  icon: LucideIcon;
  shortcut?: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Nouvelle facture",
    hint: "Émettre une facture",
    path: "/invoices/new",
    icon: ReceiptText,
    iconClass: "bg-gradient-primary text-primary-foreground shadow-glow",
    keywords: "facture invoice nouvelle créer",
  },
  {
    label: "Nouveau devis",
    hint: "Proposition commerciale",
    path: "/quotations/new",
    icon: FileText,
    iconClass: "bg-gradient-success text-success-foreground",
    keywords: "devis quotation proposition",
  },
  {
    label: "Nouveau courriel",
    hint: "Courrier commercial",
    path: "/lettre/new",
    icon: Mail,
    iconClass: "bg-gradient-primary text-primary-foreground",
    keywords: "lettre courriel courrier mail",
  },
  {
    label: "Publipostage",
    hint: "Envoi groupé",
    path: "/lettre/publipostage",
    icon: Mails,
    iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    keywords: "publipostage envoi groupe",
  },
  {
    label: "Nouveau client",
    hint: "Fiche client",
    path: "/clients/new",
    icon: Users,
    iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    keywords: "client nouveau dossier",
  },
  {
    label: "Modèles",
    hint: "Templates documents",
    path: "/templates",
    icon: Sparkles,
    iconClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    keywords: "modèle template document",
  },
];

const NAV_ACTIONS: NavAction[] = [
  { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
  { label: "Tous les documents", path: "/documents", icon: Files },
  { label: "Clients", path: "/clients", icon: Users },
  { label: "Catalogue", path: "/services", icon: Package },
  { label: "Archives", path: "/archive", icon: Archive },
];

function docPath(doc: Document) {
  if (doc.type === "invoice") return `/invoices/${doc.id}`;
  if (doc.type === "quotation") return `/quotations/${doc.id}`;
  return `/lettre/${doc.id}`;
}

function docIconClass(type: Document["type"]) {
  if (type === "invoice") return "bg-primary/12 text-primary";
  if (type === "quotation") return "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400";
  return "bg-amber-500/12 text-amber-700 dark:text-amber-400";
}

function IconBadge({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className: string;
}) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-data-[selected=true]:scale-105",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const { data: documents = [] } = useDocuments();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="border-b border-border/40 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-sm font-semibold tracking-tight">
              Recherche rapide
            </p>
            <p className="text-xs text-muted-foreground">
              Documents, clients, navigation — tout en un geste
            </p>
          </div>
          <kbd className="hidden items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm sm:inline-flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>
      </div>

      <CommandInput placeholder="Rechercher une action, un client, un document…" />

      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Aucun résultat</p>
            <p className="text-xs text-muted-foreground">
              Essayez un autre mot-clé ou parcourez les actions ci-dessous.
            </p>
          </div>
        </CommandEmpty>

        <CommandGroup
          heading="Actions rapides"
          className="[&_[cmdk-group-items]]:grid [&_[cmdk-group-items]]:grid-cols-1 [&_[cmdk-group-items]]:gap-2 sm:[&_[cmdk-group-items]]:grid-cols-2"
        >
          {QUICK_ACTIONS.map((action) => (
            <CommandItem
              key={action.path}
              value={`${action.label} ${action.hint} ${action.keywords}`}
              onSelect={() => go(action.path)}
              className="group !items-start gap-3 rounded-xl border border-border/50 bg-card/50 px-3 py-3 data-[selected=true]:border-primary/30 data-[selected=true]:bg-primary/5 data-[selected=true]:shadow-sm"
            >
              <IconBadge icon={action.icon} className={action.iconClass} />
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-tight">{action.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {action.hint}
                </div>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator className="my-2" />

        <CommandGroup heading="Navigation">
          {NAV_ACTIONS.map((action) => (
            <CommandItem
              key={action.path}
              value={action.label}
              onSelect={() => go(action.path)}
              className="group rounded-xl px-2 data-[selected=true]:bg-muted/60"
            >
              <IconBadge
                icon={action.icon}
                className="h-8 w-8 bg-muted text-muted-foreground group-data-[selected=true]:bg-background"
              />
              <span className="flex-1">{action.label}</span>
              {action.shortcut ? (
                <CommandShortcut>{action.shortcut}</CommandShortcut>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>

        {clients.length > 0 && (
          <>
            <CommandSeparator className="my-2" />
            <CommandGroup heading="Clients récents">
              {clients.slice(0, 6).map((c) => (
                <CommandItem
                  key={c.id}
                  value={`client ${c.name} ${c.email} ${c.city}`}
                  onSelect={() => go(`/clients/${c.id}`)}
                  className="group rounded-xl px-2 data-[selected=true]:bg-muted/60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/12 font-display text-xs font-bold text-rose-600 dark:text-rose-400">
                    {c.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[c.city, CABINET_LABELS[c.cabinet]].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {documents.length > 0 && (
          <>
            <CommandSeparator className="my-2" />
            <CommandGroup heading="Documents récents">
              {documents.slice(0, 8).map((d) => {
                const Icon =
                  d.type === "invoice"
                    ? ReceiptText
                    : d.type === "letter"
                      ? Mail
                      : FileText;
                return (
                  <CommandItem
                    key={d.id}
                    value={`doc ${d.number} ${documentTypeLabel(d.type)}`}
                    onSelect={() => go(docPath(d))}
                    className="group rounded-xl px-2 data-[selected=true]:bg-muted/60"
                  >
                    <IconBadge icon={Icon} className={docIconClass(d.type)} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{d.number}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {documentTypeLabel(d.type)} · {CABINET_LABELS[d.cabinet]}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/25 px-4 py-2.5 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px]">↑</kbd>
            <kbd className="rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px]">↓</kbd>
            naviguer
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
            ouvrir
          </span>
        </div>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px]">Échap</kbd>
          fermer
        </span>
      </div>
    </CommandDialog>
  );
}
