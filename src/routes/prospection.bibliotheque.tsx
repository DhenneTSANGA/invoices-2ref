import { createFileRoute } from "@tanstack/react-router";
import { BookMarked, BookOpen, Briefcase, HelpCircle, Mail, MessageCircle, Plus, Target, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { NewLibraryDialog } from "@/components/prospection/CrmForms";
import { CrmCard, CrmCardGrid, IconMark } from "@/components/prospection/CrmCards";
import { LibraryDomainBadge } from "@/components/prospection/ProspectionBadges";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN, CrmSearchEmpty, CrmSearchField, FilterChip, matchesSearch } from "@/components/prospection/CrmUi";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_DOMAIN_LABELS,
  LIBRARY_DOMAINS,
  type LibraryDomain,
  type LibraryItem,
} from "@/lib/prospection-demo";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/bibliotheque")({
  head: () => ({ meta: [{ title: "Bibliothèque — Prospection" }] }),
  component: LibraryPage,
});

const CATEGORY_MARK: Record<string, { icon: typeof Mail; tone: string }> = {
  Lexique: { icon: BookMarked, tone: "bg-primary/15 text-primary" },
  "Cibles prioritaires": { icon: Target, tone: "bg-rose-500/15 text-rose-800 dark:text-rose-300" },
  Argumentaires: { icon: MessageCircle, tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  "Questions de découverte": { icon: HelpCircle, tone: "bg-sky-500/15 text-sky-800 dark:text-sky-300" },
  "Offres types": { icon: Briefcase, tone: "bg-amber-500/15 text-amber-800 dark:text-amber-300" },
  Emails: { icon: Mail, tone: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
  WhatsApp: { icon: MessageCircle, tone: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" },
};

function copyText(item: { title: string; body: string; terms?: { term: string; def: string }[] }) {
  const glossary = item.terms?.map((t) => `${t.term} — ${t.def}`).join("\n") ?? "";
  return [item.title, item.body, glossary].filter(Boolean).join("\n\n");
}

function LibraryPage() {
  const itemsAll = useProspectionDemoStore((s) => s.libraryItems);
  const deleteLibraryItem = useProspectionDemoStore((s) => s.deleteLibraryItem);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [line, setLine] = useState<"all" | LibraryDomain>("all");
  const [category, setCategory] = useState<(typeof LIBRARY_CATEGORIES)[number] | "all">("Lexique");
  const [query, setQuery] = useState("");

  const items = useMemo(
    () =>
      itemsAll.filter(
        (i) =>
          (line === "all" || i.line === line) &&
          (category === "all" || i.category === category) &&
          matchesSearch(
            query,
            i.title,
            i.body,
            i.category,
            LIBRARY_DOMAIN_LABELS[i.line],
            ...(i.terms?.flatMap((t) => [t.term, t.def]) ?? []),
          ),
      ),
    [itemsAll, line, category, query],
  );

  return (
    <div>
      <PageHeader
        title="Bibliothèque commerciale"
        subtitle="Lexique et supports par pôle — contenus en base, éditables."
        actions={
          <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
            <Plus className="h-4 w-4" />
            Ajouter une ressource
          </button>
        }
      />
      <CrmSearchField
        value={query}
        onChange={setQuery}
        label="Rechercher dans la bibliothèque"
        placeholder="Rechercher un terme, un sigle, un argumentaire…"
      />
      <div className="mb-2 flex flex-wrap gap-2">
        <FilterChip active={line === "all"} onClick={() => setLine("all")}>
          Tous les pôles
        </FilterChip>
        {LIBRARY_DOMAINS.map((l) => (
          <FilterChip key={l} active={line === l} onClick={() => setLine(l)}>
            {LIBRARY_DOMAIN_LABELS[l]}
          </FilterChip>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
          Toutes les fiches
        </FilterChip>
        {LIBRARY_CATEGORIES.map((c) => (
          <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </FilterChip>
        ))}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {`${items.length} fiche${items.length > 1 ? "s" : ""}${
          category === "Lexique" ? " · définitions à reprendre telles quelles en rendez-vous" : ""
        }`}
      </p>
      {items.length === 0 ? (
        <CrmSearchEmpty
          title="Aucune ressource"
          description="Aucune fiche ne correspond à cette recherche."
          onClear={
            query || line !== "all" || category !== "all"
              ? () => {
                  setQuery("");
                  setLine("all");
                  setCategory("all");
                }
              : undefined
          }
        />
      ) : (
        <CrmCardGrid>
          {items.map((item, i) => {
            const mark = CATEGORY_MARK[item.category] ?? {
              icon: BookOpen,
              tone: "bg-primary/15 text-primary",
            };
            return (
              <CrmCard key={item.id} index={i} className="h-full">
                <div className="flex items-start gap-3">
                  <IconMark icon={mark.icon} tone={mark.tone} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.category}
                    </p>
                    <h2 className="mt-0.5 font-display text-base font-semibold leading-tight">{item.title}</h2>
                    <div className="mt-2">
                      <LibraryDomainBadge line={item.line} />
                    </div>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                {item.terms && item.terms.length > 0 ? (
                  <dl className="mt-4 space-y-2">
                    {item.terms.map((t) => (
                      <div key={t.term} className="rounded-xl bg-muted/50 px-3 py-2">
                        <dt className="text-sm font-semibold text-foreground">{t.term}</dt>
                        <dd className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{t.def}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <div className="mt-4 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {LIBRARY_DOMAIN_LABELS[item.line]}
                    {item.terms?.length ? ` · ${item.terms.length} termes` : ""}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={CRM_SECONDARY_BTN + " !px-3 !py-1.5 !text-xs"}
                      onClick={async () => {
                        await navigator.clipboard.writeText(copyText(item));
                        toast.success("Texte copié");
                      }}
                    >
                      Copier
                    </button>
                    <button
                      type="button"
                      className={CRM_SECONDARY_BTN + " !px-3 !py-1.5 !text-xs"}
                      onClick={() => setEditing(item)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className={CRM_SECONDARY_BTN + " !px-3 !py-1.5 !text-xs text-danger"}
                      onClick={() => {
                        if (!confirm(`Supprimer « ${item.title} » ?`)) return;
                        void deleteLibraryItem(item.id).then(
                          () => toast.success("Fiche supprimée"),
                          (err) => toast.error(err instanceof Error ? err.message : "Suppression impossible"),
                        );
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CrmCard>
            );
          })}
        </CrmCardGrid>
      )}
      <NewLibraryDialog open={open} onOpenChange={setOpen} />
      <NewLibraryDialog
        open={Boolean(editing)}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        editing={editing}
      />
    </div>
  );
}
