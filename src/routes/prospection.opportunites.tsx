import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { STAGE_LABELS, managerName, weightedAmount, type PipelineStage } from "@/lib/prospection-demo";
import { currency } from "@/lib/format";
import { LineBadge, StageBadge } from "@/components/prospection/ProspectionBadges";

export const Route = createFileRoute("/prospection/opportunites")({
  head: () => ({ meta: [{ title: "Opportunités — Prospection" }] }),
  component: OpportunitiesPage,
});

function OpportunitiesPage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const [stage, setStage] = useState<"all" | PipelineStage>("all");

  const list = useMemo(
    () => opportunities.filter((o) => stage === "all" || o.stage === stage),
    [opportunities, stage],
  );

  return (
    <div>
      <PageHeader title="Opportunités" subtitle="Montant × probabilité = pipeline pondéré." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip active={stage === "all"} onClick={() => setStage("all")} label="Toutes" />
        {(Object.keys(STAGE_LABELS) as PipelineStage[]).map((st) => (
          <Chip key={st} active={stage === st} onClick={() => setStage(st)} label={STAGE_LABELS[st]} />
        ))}
      </div>
      <div className="space-y-2">
        {list.map((o) => {
          const co = companies.find((c) => c.id === o.companyId);
          return (
            <article key={o.id} className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
              <div>
                <div className="font-display font-semibold">{co?.name}</div>
                <div className="text-sm text-muted-foreground">{o.title} · {managerName(o.ownerId)}</div>
                <div className="mt-1 flex gap-1"><LineBadge line={o.line} /></div>
              </div>
              <div className="text-right">
                <StageBadge stage={o.stage} />
                <p className="mt-1 text-sm font-semibold">{currency(o.amount)}</p>
                <p className="text-xs text-muted-foreground">Pondéré {currency(weightedAmount(o))}</p>
                <Link to="/prospection/pipeline" className="text-xs text-primary hover:underline">Pipeline</Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl px-3 py-1.5 text-xs font-medium ${active ? "bg-gradient-primary text-primary-foreground" : "border border-border"}`}>
      {label}
    </button>
  );
}
