import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { LineBadge, StageSelect } from "@/components/prospection/ProspectionBadges";
import { NewOpportunityDialog, StageChangeDialog } from "@/components/prospection/CrmForms";
import {
  CrmCard,
  CrmCardGrid,
  EntityMark,
  MetricTile,
  NextActionRow,
  ProbabilityMeter,
  STAGE_ACCENT,
} from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN, FilterChip } from "@/components/prospection/CrmUi";
import {
  SOURCE_LABELS,
  STAGE_LABELS,
  managerName,
  weightedAmount,
  type Opportunity,
  type PipelineStage,
} from "@/lib/prospection-demo";
import { currency, shortDate } from "@/lib/format";
import { readFocusSearch, useSpotlight } from "@/hooks/use-spotlight";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/opportunites")({
  validateSearch: readFocusSearch,
  head: () => ({ meta: [{ title: "Opportunités — Prospection" }] }),
  component: OpportunitiesPage,
});

const STAGES = Object.keys(STAGE_LABELS) as PipelineStage[];

function OpportunitiesPage() {
  const navigate = useNavigate();
  const { focus } = Route.useSearch();
  useSpotlight(focus, () => {
    void navigate({
      to: "/prospection/opportunites",
      search: { focus: undefined },
      replace: true,
      resetScroll: false,
    });
  });
  const companies = useProspectionDemoStore((s) => s.companies);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const [stage, setFilter] = useState<"all" | PipelineStage>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [pending, setPending] = useState<{ id: string; stage: PipelineStage } | null>(null);

  const list = useMemo(
    () =>
      opportunities.filter(
        (o) => o.id === focus || stage === "all" || o.stage === stage,
      ),
    [opportunities, stage, focus],
  );

  const counts = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((st) => [st, 0])) as Record<PipelineStage, number>;
    for (const o of opportunities) map[o.stage] += 1;
    return map;
  }, [opportunities]);

  const weighted = list.reduce((s, o) => s + weightedAmount(o), 0);

  function applyStage(id: string, next: PipelineStage) {
    const current = opportunities.find((o) => o.id === id);
    if (!current || current.stage === next) return;
    setPending({ id, stage: next });
  }

  return (
    <div>
      <PageHeader
        title="Opportunités"
        subtitle={`${list.length} affaire(s) · pipeline pondéré ${currency(weighted)} · chaque étape enregistre une activité`}
        actions={
          <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
            <Plus className="h-4 w-4" />
            Nouvelle opportunité
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={stage === "all"} onClick={() => setFilter("all")}>
          Toutes ({opportunities.length})
        </FilterChip>
        {STAGES.map((st) => (
          <FilterChip key={st} active={stage === st} onClick={() => setFilter(st)}>
            {STAGE_LABELS[st]} ({counts[st]})
          </FilterChip>
        ))}
      </div>
      <CrmCardGrid dense>
        {list.map((o, i) => {
          const co = companies.find((c) => c.id === o.companyId);
          return (
            <CrmCard
              key={o.id}
              index={i}
              accent={STAGE_ACCENT[o.stage]}
              className="h-full"
              spotId={o.id}
              spotlight={focus === o.id}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  onClick={() => setEditing(o)}
                >
                  <EntityMark name={co?.name ?? o.title} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-base font-semibold leading-tight hover:text-primary">
                      {co?.name ?? "Entreprise"}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{o.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <LineBadge line={o.line} />
                      <span className="text-[11px] text-muted-foreground">{SOURCE_LABELS[o.source]}</span>
                    </div>
                  </div>
                </button>
                <StageSelect value={o.stage} onChange={(next) => applyStage(o.id, next)} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MetricTile label="Montant" value={currency(o.amount)} />
                <MetricTile
                  label="Pondéré"
                  value={currency(weightedAmount(o))}
                  hint={`${o.probability} % · ${managerName(o.ownerId)}`}
                  accent
                />
              </div>
              <div className="mt-4">
                <ProbabilityMeter value={o.probability} />
              </div>
              {o.lostReason ? (
                <p className="mt-3 rounded-2xl bg-danger/8 px-3 py-2 text-xs text-danger">
                  Motif : {o.lostReason}
                </p>
              ) : null}
              {o.reviveOn ? (
                <p className="mt-3 text-xs text-muted-foreground">Relance prévue le {shortDate(o.reviveOn)}</p>
              ) : null}
              <NextActionRow action={o.nextAction} date={o.nextActionOn} empty="Prochaine action à fixer" />
            </CrmCard>
          );
        })}
      </CrmCardGrid>
      <NewOpportunityDialog open={open} onOpenChange={setOpen} />
      <NewOpportunityDialog
        open={Boolean(editing)}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        editing={editing}
      />
      <StageChangeDialog
        open={Boolean(pending)}
        onOpenChange={(v) => {
          if (!v) setPending(null);
        }}
        opportunityId={pending?.id ?? null}
        nextStage={pending?.stage ?? null}
      />
    </div>
  );
}
