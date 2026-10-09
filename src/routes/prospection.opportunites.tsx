import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LineBadge, StageSelect, nextPipelineStage } from "@/components/prospection/ProspectionBadges";
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
import {
  CRM_PRIMARY_BTN,
  CRM_SECONDARY_BTN,
  CrmSearchEmpty,
  CrmSearchField,
  FilterChip,
  matchesSearch,
} from "@/components/prospection/CrmUi";
import {
  SERVICE_LINE_LABELS,
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
import { useProspectionCompanies } from "@/hooks/use-prospection-companies";

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
  const { companies } = useProspectionCompanies();
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const deleteOpportunity = useProspectionDemoStore((s) => s.deleteOpportunity);
  const [stage, setFilter] = useState<"all" | PipelineStage>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [pending, setPending] = useState<{ id: string; stage: PipelineStage } | null>(null);

  const list = useMemo(() => {
    return opportunities.filter((o) => {
      if (o.id === focus) return true;
      if (stage !== "all" && o.stage !== stage) return false;
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
  }, [opportunities, companies, stage, query, focus]);

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
        subtitle={`${list.length} affaire(s) · pipeline pondéré ${currency(weighted)} · validez chaque étape avec un commentaire pour avancer`}
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
        <FilterChip active={stage === "all"} onClick={() => setFilter("all")}>
          Toutes ({opportunities.length})
        </FilterChip>
        {STAGES.map((st) => (
          <FilterChip key={st} active={stage === st} onClick={() => setFilter(st)}>
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
          return (
            <CrmCard
              key={o.id}
              index={i}
              accent={STAGE_ACCENT[o.stage]}
              className="h-full"
              spotId={o.id}
              spotlight={focus === o.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <button
                  type="button"
                  className="crm-quiet-hit group/hit flex min-w-0 flex-1 items-start gap-3 text-left"
                  onClick={() => setEditing(o)}
                >
                  <EntityMark name={co?.name ?? o.title} />
                  <div className="min-w-0 flex-1 rounded-2xl bg-primary/10 px-3 py-2.5 transition-colors group-hover/hit:bg-primary/20">
                    <h2 className="font-display text-base font-semibold leading-tight transition-colors group-hover/hit:text-primary">
                      {co?.name ?? "Entreprise"}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{o.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <LineBadge line={o.line} />
                      <span className="text-[11px] text-muted-foreground">{SOURCE_LABELS[o.source]}</span>
                    </div>
                  </div>
                </button>
                <div className="flex flex-col items-stretch gap-2 self-start sm:items-end sm:self-auto">
                  <StageSelect value={o.stage} onChange={(n) => applyStage(o.id, n)} />
                  {next ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        applyStage(o.id, next);
                      }}
                      className={`${CRM_SECONDARY_BTN} !h-8 !px-3 !text-xs`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {o.stage === "qualification"
                        ? `Passer en ${STAGE_LABELS[next]}`
                        : `Valider ${STAGE_LABELS[o.stage]}`}
                    </button>
                  ) : o.stage === "decision" ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        applyStage(o.id, "gagne");
                      }}
                      className={`${CRM_SECONDARY_BTN} !h-8 !px-3 !text-xs`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Valider et gagner
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!confirm("Supprimer cette opportunité ?")) return;
                      void deleteOpportunity(o.id).then(
                        () => toast.success("Opportunité supprimée"),
                        (err) =>
                          toast.error(err instanceof Error ? err.message : "Suppression impossible"),
                      );
                    }}
                    className={`${CRM_SECONDARY_BTN} !h-8 !px-3 !text-xs text-danger`}
                  >
                    Supprimer
                  </button>
                </div>
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
      )}
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
