import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { EditObjectivesDialog } from "@/components/prospection/CrmForms";
import {
  CrmCard,
  CrmCardGrid,
  EntityMark,
  ProgressMeter,
} from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN } from "@/components/prospection/CrmUi";
import { LineBadge } from "@/components/prospection/ProspectionBadges";
import { MANAGERS, OBJECTIVE_LABELS, realizedForMetric } from "@/lib/prospection-demo";
import { canApproveExpenses, crmRoleFromStaff } from "@/lib/prospection-access";
import { cn } from "@/lib/utils";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/objectifs")({
  head: () => ({ meta: [{ title: "Objectifs — Prospection" }] }),
  component: ObjectivesPage,
});

function ObjectivesPage() {
  const { session } = useRouteContext({ from: "/prospection" });
  const crm = crmRoleFromStaff(session.staff.role);
  const canEdit = canApproveExpenses(crm);
  const data = useProspectionDemoStore((s) => s);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Objectifs"
        subtitle="8 semaines — Objectif → Réalisé → % → Écart. Le réalisé est calculé tout seul."
        actions={
          canEdit ? (
            <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
              Modifier les cibles
            </button>
          ) : undefined
        }
      />
      <CrmCardGrid>
        {MANAGERS.map((m, i) => {
          const rows = data.objectives.filter((o) => o.managerId === m.id);
          return (
            <CrmCard key={m.id} index={i} className="h-full">
              <div className="flex items-start gap-3">
                <EntityMark name={m.name} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-semibold">{m.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.lines.map((l) => (
                      <LineBadge key={l} line={l} />
                    ))}
                  </div>
                </div>
              </div>
              <ul className="mt-4 space-y-3">
                {rows.map((o) => {
                  const done = realizedForMetric(data, o.metric, m.id);
                  const pct = o.target === 0 ? 0 : Math.round((done / o.target) * 100);
                  const gap = done - o.target;
                  return (
                    <li key={o.id} className="rounded-2xl bg-muted/45 px-3 py-2.5">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{OBJECTIVE_LABELS[o.metric]}</span>
                        <span
                          className={cn(
                            "text-xs font-semibold tabular-nums",
                            gap >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-danger",
                          )}
                        >
                          {gap >= 0 ? `+${gap}` : gap}
                        </span>
                      </div>
                      <ProgressMeter
                        value={pct}
                        label={`${done} / ${o.target} réalisé`}
                        hint={`${pct} %`}
                      />
                    </li>
                  );
                })}
              </ul>
            </CrmCard>
          );
        })}
      </CrmCardGrid>
      <EditObjectivesDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
