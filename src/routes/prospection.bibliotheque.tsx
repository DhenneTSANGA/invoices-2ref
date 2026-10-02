import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Briefcase, HelpCircle, Mail, MessageCircle, Plus, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { NewLibraryDialog } from "@/components/prospection/CrmForms";
import { CrmCard, CrmCardGrid, IconMark } from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN, FilterChip } from "@/components/prospection/CrmUi";
import { LineBadge } from "@/components/prospection/ProspectionBadges";
import {
  HELP_LIBRARY,
  SERVICE_LINE_LABELS,
  SERVICE_LINES,
  type ServiceLine,
} from "@/lib/prospection-demo";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/bibliotheque")({
  head: () => ({ meta: [{ title: "Bibliothèque — Prospection" }] }),
  component: LibraryPage,
});

const CATEGORY_MARK: Record<string, { icon: typeof Mail; tone: string }> = {
  "Cibles prioritaires": { icon: Target, tone: "bg-rose-500/15 text-rose-800 dark:text-rose-300" },
  Argumentaires: { icon: MessageCircle, tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  "Questions de découverte": { icon: HelpCircle, tone: "bg-sky-500/15 text-sky-800 dark:text-sky-300" },
  "Offres types": { icon: Briefcase, tone: "bg-amber-500/15 text-amber-800 dark:text-amber-300" },
  Emails: { icon: Mail, tone: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
  WhatsApp: { icon: MessageCircle, tone: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" },
};

function LibraryPage() {
  const extras = useProspectionDemoStore((s) => s.libraryItems);
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState<"all" | ServiceLine>("all");
  const items = useMemo(
    () => [...extras, ...HELP_LIBRARY].filter((i) => line === "all" || i.line === line),
    [extras, line],
  );

  return (
    <div>
      <PageHeader
        title="Bibliothèque commerciale"
        subtitle="Cibles, argumentaires, questions, offres, e-mails, WhatsApp — par ligne de service."
        actions={
          <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
            <Plus className="h-4 w-4" />
            Ajouter une ressource
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={line === "all"} onClick={() => setLine("all")}>
          Toutes les lignes
        </FilterChip>
        {SERVICE_LINES.map((l) => (
          <FilterChip key={l} active={line === l} onClick={() => setLine(l)}>
            {SERVICE_LINE_LABELS[l]}
          </FilterChip>
        ))}
      </div>
      <CrmCardGrid>
        {items.map((item, i) => {
          const mark = CATEGORY_MARK[item.category] ?? {
            icon: BookOpen,
            tone: "bg-primary/15 text-primary",
          };
          return (
            <CrmCard key={`${item.line}-${item.category}-${item.title}-${i}`} index={i} className="h-full">
              <div className="flex items-start gap-3">
                <IconMark icon={mark.icon} tone={mark.tone} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.category}
                  </p>
                  <h2 className="mt-0.5 font-display text-base font-semibold leading-tight">{item.title}</h2>
                  <div className="mt-2">
                    <LineBadge line={item.line} />
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{SERVICE_LINE_LABELS[item.line]} · démo</p>
                <button
                  type="button"
                  className={CRM_SECONDARY_BTN + " !px-3 !py-1.5 !text-xs"}
                  onClick={async () => {
                    await navigator.clipboard.writeText(item.body);
                    toast.success("Texte copié");
                  }}
                >
                  Copier
                </button>
              </div>
            </CrmCard>
          );
        })}
      </CrmCardGrid>
      <NewLibraryDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
