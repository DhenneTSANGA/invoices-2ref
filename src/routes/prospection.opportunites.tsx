import { createFileRoute, useNavigate, useRouteContext } from "@tanstack/react-router";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Trophy,
  XCircle,
  Clock,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LineBadge, StageBadge } from "@/components/prospection/ProspectionBadges";
import { NewOpportunityDialog } from "@/components/prospection/CrmForms";
import {
  StageTransitionDialog,
  type StageTransition,
} from "@/components/prospection/StageTransitionDialog";
import {
  CrmCard,
  CrmCardGrid,
  EntityMark,
  MetricTile,
  NextActionRow,
  STAGE_ACCENT,
} from "@/components/prospection/CrmCards";
import {
  CRM_PRIMARY_BTN,
  CRM_SECONDARY_BTN,
  CrmSearchEmpty,
  CrmSearchField,
  FilterChip,
  matchesSearch,
} from "@/components/prospection/CrmUi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PIPELINE_STAGES,
  SERVICE_LINE_LABELS,
  SOURCE_LABELS,
  STAGE_ADVANCE_LABEL,
  STAGE_LABELS,
  isReviveDue,
  isoDate,
  managerName,
  nextPipelineStage,
  weightedAmount,
  type Opportunity,
  type PipelineStage,
} from "@/lib/prospection-model";
import { canSeeAllPortfolios, crmRoleFromStaff } from "@/lib/prospection-access";
import { currency, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { readFocusSearch, useSpotlight } from "@/hooks/use-spotlight";
import { useProspectionStore } from "@/store/useProspectionStore";
import { useProspectionCompanies } from "@/hooks/use-prospection-companies";

export const Route = createFileRoute("/prospection/opportunites")({
  validateSearch: readFocusSearch,
  head: () => ({ meta: [{ title: "Opportunités — Prospection" }] }),
  component: OpportunitiesPage,
});

const STAGES = Object.keys(STAGE_LABELS) as PipelineStage[];
type Filter = "all" | "revive" | PipelineStage;

function OpportunitiesPage() {
  const navigate = useNavigate();
  const { session } = useRouteContext({ from: "/prospection" });
  const seeAll = canSeeAllPortfolios(crmRoleFromStaff(session.staff));
  const { focus } = Route.useSearch();
  useSpotlight(focus, () => {
    void navigate({
      to: "/prospection/opportunites",
      search: { focus: undefined },
      replace: true,
      resetScroll: false,
    });
  });
  const { companies } = useProspectionCompanies();
  const opportunities = useProspectionStore((s) => s.opportunities);
  const deleteOpportunity = useProspectionStore((s) => s.deleteOpportunity);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [transition, setTransition] = useState<StageTransition | null>(null);
  const today = isoDate();

  const list = useMemo(() => {
    return opportunities.filter((o) => {
      if (o.id === focus) return true;
      if (filter === "revive" && !isReviveDue(o, today)) return false;
      if (filter !== "all" && filter !== "revive" && o.stage !== filter) return false;
      const co = companies.find((c) => c.id === o.companyId);
      return matchesSearch(
        query,
        co?.name,
        o.title,
        SERVICE_LINE_LABELS[o.line],
        SOURCE_LABELS[o.source],
        STAGE_LABELS[o.stage],
        managerName(o.ownerId),
        o.nextAction,
        o.notes,
        o.amount,
      );
    });
  }, [opportunities, companies, filter, query, focus, today]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((st) => [st, 0])) as Record<PipelineStage, number>;
    for (const o of opportunities) map[o.stage] += 1;
    return map;
  }, [opportunities]);
  const reviveCount = opportunities.filter((o) => isReviveDue(o, today)).length;

  const weighted = list.reduce((s, o) => s + weightedAmount(o), 0);
  const go = (opportunityId: string, target: StageTransition["target"]) =>
    setTransition({ opportunityId, target });

  // Suppression : direction, ou affaire saisie par erreur aujourd’hui (sinon on clôture).
  const canDelete = (o: Opportunity) => seeAll || o.createdAt === today;

  const remove = (o: Opportunity) => {
    if (!confirm("Supprimer définitivement cette opportunité ? (Pour une affaire réelle, préférez « Perdue ».)")) return;
    void deleteOpportunity(o.id).then(
      () => toast.success("Opportunité supprimée"),
      (err) => toast.error(err instanceof Error ? err.message : "Suppression impossible"),
    );
  };

  return (
    <div>
      <PageHeader
        title="Opportunités"
        subtitle={`${list.length} affaire(s) · pipeline pondéré ${currency(weighted)}`}
        actions={
          <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
            <Plus className="h-4 w-4" />
            Nouvelle opportunité
          </button>
        }
      />
      <CrmSearchField
        value={query}
        onChange={setQuery}
        label="Rechercher une opportunité"
        placeholder="Rechercher une entreprise, une affaire, une ligne, un manager…"
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Toutes ({opportunities.length})
        </FilterChip>
        {reviveCount > 0 ? (
          <FilterChip active={filter === "revive"} onClick={() => setFilter("revive")}>
            <BellRing className="mr-1 inline h-3.5 w-3.5" aria-hidden />À relancer ({reviveCount})
          </FilterChip>
        ) : null}
        {STAGES.map((st) => (
          <FilterChip key={st} active={filter === st} onClick={() => setFilter(st)}>
            {STAGE_LABELS[st]} ({counts[st]})
          </FilterChip>
        ))}
      </div>
      {list.length === 0 ? (
        <CrmSearchEmpty
          title="Aucune opportunité"
          description="Aucune affaire ne correspond à cette recherche."
          onClear={query ? () => setQuery("") : undefined}
        />
      ) : (
        <CrmCardGrid dense>
          {list.map((o, i) => {
            const co = companies.find((c) => c.id === o.companyId);
            const next = nextPipelineStage(o.stage);
            const reviveDue = isReviveDue(o, today);
            const closed = o.stage === "perdu" || o.stage === "reporte";
            return (
              <CrmCard
                key={o.id}
                index={i}
                accent={STAGE_ACCENT[o.stage]}
                className="flex h-full flex-col"
                spotId={o.id}
                spotlight={focus === o.id}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="crm-quiet-hit group/hit flex min-w-0 flex-1 items-start gap-3 text-left"
                    onClick={() => setEditing(o)}
                    title="Modifier l’affaire"
                  >
                    <EntityMark name={co?.name ?? o.title} />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-base font-semibold leading-tight transition-colors group-hover/hit:text-primary">
                        {co?.name ?? "Entreprise"}
                      </h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">{o.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <LineBadge line={o.line} />
                        <span className="text-xs text-muted-foreground">{SOURCE_LABELS[o.source]}</span>
                      </div>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <StageBadge stage={o.stage} />
                    <OpportunityMenu
                      opportunity={o}
                      canDelete={canDelete(o)}
                      onEdit={() => setEditing(o)}
                      onGo={(target) => go(o.id, target)}
                      onDelete={() => remove(o)}
                    />
                  </div>
                </div>

                <StageProgress stage={o.stage} />

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MetricTile label="Montant" value={currency(o.amount)} />
                  <MetricTile
                    label="Pondéré"
                    value={currency(weightedAmount(o))}
                    hint={`${o.probability} % · ${managerName(o.ownerId)}`}
                    accent
                  />
                </div>
                {o.lostReason && o.stage === "perdu" ? (
                  <p className="mt-3 rounded-2xl bg-danger/8 px-3 py-2 text-sm text-danger">
                    Motif : {o.lostReason}
                  </p>
                ) : null}
                {closed && o.reviveOn ? (
                  <p
                    className={cn(
                      "mt-3 rounded-2xl px-3 py-2 text-sm",
                      reviveDue
                        ? "bg-emerald-500/10 font-medium text-emerald-800 dark:text-emerald-300"
                        : "bg-muted/50 text-muted-foreground",
                    )}
                  >
                    {reviveDue ? "Relance due depuis le " : "Relance prévue le "}
                    {shortDate(o.reviveOn)}
                  </p>
                ) : null}
                {!closed && o.stage !== "gagne" ? (
                  <NextActionRow action={o.nextAction} date={o.nextActionOn} empty="Prochaine action à fixer" />
                ) : null}

                {/* Une seule action principale par carte. */}
                <div className="mt-auto pt-4">
                  {o.stage === "gagne" ? (
                    <p className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      <Lock className="h-4 w-4" aria-hidden />
                      Affaire gagnée · verrouillée
                    </p>
                  ) : closed ? (
                    <button
                      type="button"
                      onClick={() => go(o.id, "reopen")}
                      className={cn(reviveDue ? CRM_PRIMARY_BTN : CRM_SECONDARY_BTN, "w-full justify-center")}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {reviveDue ? "Relancer · rouvrir l’affaire" : "Rouvrir l’affaire"}
                    </button>
                  ) : next ? (
                    <button
                      type="button"
                      onClick={() => go(o.id, next)}
                      className={cn(CRM_PRIMARY_BTN, "w-full justify-between")}
                    >
                      <span className="inline-flex items-center gap-2">
                        {next === "gagne" ? <Trophy className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        {STAGE_ADVANCE_LABEL[o.stage]}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium opacity-85">
                        {STAGE_LABELS[next]}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  ) : null}
                </div>
              </CrmCard>
            );
          })}
        </CrmCardGrid>
      )}
      <NewOpportunityDialog open={open} onOpenChange={setOpen} />
      <NewOpportunityDialog
        open={Boolean(editing)}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        editing={editing}
      />
      <StageTransitionDialog transition={transition} onClose={() => setTransition(null)} />
    </div>
  );
}

/** Avancement dans les 7 étapes du pipeline (gagnée : tout rempli ; perdue / reportée : grisé). */
function StageProgress({ stage }: { stage: PipelineStage }) {
  const reached = stage === "gagne" ? PIPELINE_STAGES.length : PIPELINE_STAGES.indexOf(stage) + 1;
  const closed = stage === "perdu" || stage === "reporte";
  return (
    <div className="mt-4" aria-label={`Étape ${STAGE_LABELS[stage]}`}>
      <div className="flex gap-1">
        {PIPELINE_STAGES.map((st, i) => (
          <span
            key={st}
            title={STAGE_LABELS[st]}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              closed
                ? "bg-muted"
                : i < reached
                  ? stage === "gagne"
                    ? "bg-emerald-500"
                    : "bg-primary"
                  : "bg-muted",
            )}
          />
        ))}
      </div>
      {!closed ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Étape {Math.min(reached, PIPELINE_STAGES.length)} sur {PIPELINE_STAGES.length}
          {stage !== "gagne" ? ` · ${STAGE_LABELS[stage]}` : " · gagnée"}
        </p>
      ) : null}
    </div>
  );
}

/** Actions secondaires : modifier, sauter / revenir, clôturer, supprimer. */
function OpportunityMenu({
  opportunity: o,
  canDelete,
  onEdit,
  onGo,
  onDelete,
}: {
  opportunity: Opportunity;
  canDelete: boolean;
  onEdit: () => void;
  onGo: (target: StageTransition["target"]) => void;
  onDelete: () => void;
}) {
  const index = PIPELINE_STAGES.indexOf(o.stage);
  const active = index >= 0;
  const closed = o.stage === "perdu" || o.stage === "reporte";
  const later = active ? PIPELINE_STAGES.slice(index + 2) : [];
  const earlier = active ? PIPELINE_STAGES.slice(0, index) : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Autres actions"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-xl">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Modifier l’affaire
        </DropdownMenuItem>
        {closed ? (
          <DropdownMenuItem onSelect={() => onGo("reopen")}>
            <RotateCcw className="mr-2 h-4 w-4" /> Rouvrir l’affaire
          </DropdownMenuItem>
        ) : null}
        {later.length > 0 ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ChevronsRight className="mr-2 h-4 w-4" /> Passer directement à…
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="rounded-xl">
              {later.map((st) => (
                <DropdownMenuItem key={st} onSelect={() => onGo(st)}>
                  {STAGE_LABELS[st]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        {earlier.length > 0 ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ChevronsLeft className="mr-2 h-4 w-4" /> Revenir à…
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="rounded-xl">
              {earlier.map((st) => (
                <DropdownMenuItem key={st} onSelect={() => onGo(st)}>
                  {STAGE_LABELS[st]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        {active ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Clôturer
            </DropdownMenuLabel>
            {o.stage !== "decision" ? (
              <DropdownMenuItem onSelect={() => onGo("gagne")}>
                <Trophy className="mr-2 h-4 w-4 text-emerald-600" /> Gagnée
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => onGo("perdu")}>
              <XCircle className="mr-2 h-4 w-4 text-danger" /> Perdue
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onGo("reporte")}>
              <Clock className="mr-2 h-4 w-4" /> Reportée
            </DropdownMenuItem>
          </>
        ) : null}
        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} className="text-danger focus:text-danger">
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
