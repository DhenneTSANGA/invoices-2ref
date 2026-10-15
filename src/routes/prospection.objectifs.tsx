import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
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
import { OBJECTIVE_LABELS, portfolioManagers, realizedForMetric } from "@/lib/prospection-model";
import { canApproveExpenses, crmRoleFromStaff } from "@/lib/prospection-access";
import { cn } from "@/lib/utils";
import { currentCrmMonth, monthLabelFr, shiftCrmMonth } from "@/lib/crm-month";
import { useProspectionStore } from "@/store/useProspectionStore";

export const Route = createFileRoute("/prospection/objectifs")({
  head: () => ({ meta: [{ title: "Objectifs — Prospection" }] }),
  component: ObjectivesPage,
});

function ObjectivesPage() {
  const { session } = useRouteContext({ from: "/prospection" });
  const crm = crmRoleFromStaff(session.staff);
  const canEdit = canApproveExpenses(crm);
  const data = useProspectionStore((s) => s);
  const ensureObjectivesMonth = useProspectionStore((s) => s.ensureObjectivesMonth);
  const [month, setMonth] = useState(currentCrmMonth);
  const managers = canEdit
    ? portfolioManagers(data.managers)
    : data.managers.filter((m) => m.id === session.staff.id);
  const [open, setOpen] = useState(false);
  const hasMonth = data.objectives.some((o) => o.month === month);

  useEffect(() => {
    // Mois sans cibles : reprise automatique des cibles du dernier mois saisi.
    if (!hasMonth && data.managers.length > 0) void ensureObjectivesMonth(month);
  }, [hasMonth, month, data.managers.length, ensureObjectivesMonth]);

  return (
    <div>
      <PageHeader
        title="Objectifs"
        subtitle="Objectifs mensuels par manager — Objectif → Réalisé du mois → % → Écart."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-surface px-1 py-1">
              <button
                type="button"
                aria-label="Mois précédent"
                onClick={() => setMonth((m) => shiftCrmMonth(m, -1))}
                className="rounded-lg p-1.5 hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[8.5rem] text-center text-sm font-semibold capitalize">
                {monthLabelFr(month)}
              </span>
              <button
                type="button"
                aria-label="Mois suivant"
                onClick={() => setMonth((m) => shiftCrmMonth(m, 1))}
                className="rounded-lg p-1.5 hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {canEdit ? (
              <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
                Modifier les cibles
              </button>
            ) : null}
          </div>
        }
      />
      <CrmCardGrid>
        {managers.map((m, i) => {
          const rows = data.objectives.filter((o) => o.managerId === m.id && o.month === month);
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
                  const done = realizedForMetric(data, o.metric, m.id, month);
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
      <EditObjectivesDialog open={open} onOpenChange={setOpen} month={month} />
    </div>
  );
}
