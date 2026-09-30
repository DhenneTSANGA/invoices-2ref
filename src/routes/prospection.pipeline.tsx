import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import {
  ACTIVE_STAGES,
  STAGE_LABELS,
  managerName,
  weightedAmount,
  type PipelineStage,
} from "@/lib/prospection-demo";
import { currency, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LineBadge, StageBadge } from "@/components/prospection/ProspectionBadges";

export const Route = createFileRoute("/prospection/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — Prospection" }] }),
  component: PipelinePage,
});

function PipelinePage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const setStage = useProspectionDemoStore((s) => s.setStage);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [lossFor, setLossFor] = useState<string | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reviveOn, setReviveOn] = useState("");

  const selected = opportunities.find((o) => o.id === selectedId) ?? null;
  const selectedCompany = selected ? companies.find((c) => c.id === selected.companyId) : null;

  const byStage = useMemo(() => {
    const map: Record<string, typeof opportunities> = {};
    for (const stage of ACTIVE_STAGES) {
      map[stage] = opportunities.filter((o) => o.stage === stage);
    }
    return map;
  }, [opportunities]);

  function applyStage(id: string, stage: PipelineStage) {
    if (stage === "perdu") {
      setLossFor(id);
      return;
    }
    if (stage === "reporte") {
      setReportFor(id);
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      setReviveOn(d.toISOString().slice(0, 10));
      return;
    }
    setStage(id, stage);
  }

  function onDrop(stage: PipelineStage) {
    if (!dragId) return;
    applyStage(dragId, stage);
    setDragId(null);
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle="Glissez-déposez. Perdue = motif. Reportée = relance à 3 mois, jamais de suppression."
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {ACTIVE_STAGES.map((stage) => {
          const list = byStage[stage] ?? [];
          const total = list.reduce((s, o) => s + o.amount, 0);
          const weighted = list.reduce((s, o) => s + weightedAmount(o), 0);
          return (
            <div
              key={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(stage)}
              className="flex min-w-[17.5rem] flex-1 flex-col rounded-3xl border border-border/60 bg-surface/50"
            >
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{STAGE_LABELS[stage]}</span>
                  <span className="text-sm text-muted-foreground">{list.length}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {currency(total)} · pondéré {currency(weighted)}
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-3 px-3 pb-4">
                {list.map((o) => {
                  const co = companies.find((c) => c.id === o.companyId);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      draggable
                      onDragStart={() => setDragId(o.id)}
                      onClick={() => setSelectedId(o.id)}
                      className={cn(
                        "cursor-grab rounded-2xl border px-4 py-3.5 text-left active:cursor-grabbing",
                        selectedId === o.id ? "border-primary bg-primary/5" : "border-border/60 bg-background hover:bg-muted/60",
                      )}
                    >
                      <div className="font-display font-semibold leading-snug">{co?.name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{o.title}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <LineBadge line={o.line} />
                      </div>
                      <div className="mt-3 flex justify-between text-sm">
                        <span className="font-semibold">{currency(o.amount)}</span>
                        <span className="text-muted-foreground">{o.probability}%</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {managerName(o.ownerId)} · {o.nextAction} · {shortDate(o.nextActionOn)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["gagne", "perdu", "reporte"] as PipelineStage[]).map((st) => (
          <div
            key={st}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(st)}
            className="rounded-2xl border border-dashed border-border px-4 py-2 text-sm"
          >
            Déposer → {STAGE_LABELS[st]}
          </div>
        ))}
      </div>

      {lossFor ? (
        <form
          className="glass-panel mb-4 space-y-3 rounded-3xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!lossReason.trim()) {
              toast.error("Motif de perte obligatoire");
              return;
            }
            setStage(lossFor, "perdu", { lostReason: lossReason.trim() });
            setLossFor(null);
            setLossReason("");
            toast.success("Opportunité perdue — conservée en historique");
          }}
        >
          <h3 className="font-display font-semibold">Motif de perte</h3>
          <textarea
            value={lossReason}
            onChange={(e) => setLossReason(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            rows={3}
          />
          <button type="submit" className="rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Confirmer
          </button>
        </form>
      ) : null}

      {reportFor ? (
        <form
          className="glass-panel mb-4 space-y-3 rounded-3xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            setStage(reportFor, "reporte", { reviveOn });
            setReportFor(null);
            toast.success("Reportée — relance programmée");
          }}
        >
          <h3 className="font-display font-semibold">Date de relance (3 mois par défaut)</h3>
          <input
            type="date"
            value={reviveOn}
            onChange={(e) => setReviveOn(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Programmer
          </button>
        </form>
      ) : null}

      {selected && selectedCompany ? (
        <aside className="glass-panel rounded-3xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold">{selectedCompany.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{selected.title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StageBadge stage={selected.stage} />
                <LineBadge line={selected.line} />
              </div>
            </div>
            <p className="text-base font-semibold">
              {currency(selected.amount)} · pondéré {currency(weightedAmount(selected))}
            </p>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{selected.notes}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Décision {shortDate(selected.decisionOn)} · {selected.nextAction} · {shortDate(selected.nextActionOn)}
          </p>
        </aside>
      ) : (
        <p className="text-sm text-muted-foreground">Cliquez une carte ou glissez-la vers une étape.</p>
      )}
    </div>
  );
}
