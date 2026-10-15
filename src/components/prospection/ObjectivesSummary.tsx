import { EntityMark } from "@/components/prospection/CrmCards";
import {
  OBJECTIVE_LABELS,
  realizedForMetric,
  type Manager,
  type Objective,
  type ProspectionData,
} from "@/lib/prospection-model";
import { cn } from "@/lib/utils";

const METRICS = Object.keys(OBJECTIVE_LABELS) as Objective["metric"][];

const SHORT_LABELS: Record<Objective["metric"], string> = {
  qualifies: "Qualifiés",
  contacts: "Contacts",
  rdv: "RDV",
  propositions: "Propositions",
  signatures: "Signées",
};

type Cell = { done: number; target: number; pct: number };

function cellsFor(
  data: ProspectionData,
  managerId: string,
  month: string,
): Map<Objective["metric"], Cell> {
  const cells = new Map<Objective["metric"], Cell>();
  for (const o of data.objectives) {
    if (o.managerId !== managerId || o.month !== month) continue;
    const done = realizedForMetric(data, o.metric, managerId, month);
    cells.set(o.metric, {
      done,
      target: o.target,
      pct: o.target > 0 ? Math.round((done / o.target) * 100) : 0,
    });
  }
  return cells;
}

/** Score global : moyenne des taux d’atteinte, chaque indicateur plafonné à 100 %. */
function overall(cells: Map<Objective["metric"], Cell>): number {
  const list = [...cells.values()].filter((c) => c.target > 0);
  if (list.length === 0) return 0;
  return Math.round(list.reduce((s, c) => s + Math.min(100, c.pct), 0) / list.length);
}

function barTone(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 50) return "bg-primary";
  if (pct > 0) return "bg-amber-500";
  return "bg-muted-foreground/30";
}

function Bar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all", barTone(pct))}
        style={{ width: `${Math.min(100, Math.max(pct, pct > 0 ? 4 : 0))}%` }}
      />
    </div>
  );
}

/**
 * Objectifs du mois : la direction voit tous les managers dans un tableau
 * compact ; un manager ne voit que ses propres indicateurs.
 */
export function ObjectivesSummary({
  data,
  managers,
  month,
  mode,
}: {
  data: ProspectionData;
  managers: Manager[];
  month: string;
  mode: "direction" | "self";
}) {
  if (managers.length === 0) {
    return (
      <p className="rounded-2xl bg-muted/45 px-3 py-2.5 text-sm text-muted-foreground">
        Aucun objectif pour ce mois.
      </p>
    );
  }

  if (mode === "self") {
    const cells = cellsFor(data, managers[0].id, month);
    return (
      <ul className="space-y-2.5">
        {METRICS.map((metric) => {
          const c = cells.get(metric) ?? { done: 0, target: 0, pct: 0 };
          return (
            <li key={metric}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span>{OBJECTIVE_LABELS[metric]}</span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{c.done}</span>/{c.target}
                  <span className="ml-1.5 text-xs">{c.pct} %</span>
                </span>
              </div>
              <Bar pct={c.pct} />
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[30rem] text-sm">
        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="pb-2 pr-2 text-left font-semibold">Manager</th>
            {METRICS.map((m) => (
              <th key={m} className="px-1.5 pb-2 text-left font-semibold">
                {SHORT_LABELS[m]}
              </th>
            ))}
            <th className="pb-2 pl-1.5 text-right font-semibold">Global</th>
          </tr>
        </thead>
        <tbody>
          {managers.map((manager) => {
            const cells = cellsFor(data, manager.id, month);
            const score = overall(cells);
            return (
              <tr key={manager.id} className="border-t border-border/50">
                <td className="py-2.5 pr-2">
                  <div className="flex items-center gap-2">
                    <EntityMark name={manager.name} size="sm" />
                    <span className="max-w-[7rem] truncate font-medium" title={manager.name}>
                      {manager.name}
                    </span>
                  </div>
                </td>
                {METRICS.map((metric) => {
                  const c = cells.get(metric) ?? { done: 0, target: 0, pct: 0 };
                  return (
                    <td
                      key={metric}
                      className="px-1.5 py-2.5 align-middle"
                      title={`${OBJECTIVE_LABELS[metric]} : ${c.done}/${c.target} (${c.pct} %)`}
                    >
                      <div className="text-xs tabular-nums">
                        <span className="font-semibold">{c.done}</span>
                        <span className="text-muted-foreground">/{c.target}</span>
                      </div>
                      <Bar pct={c.pct} className="mt-1 w-12" />
                    </td>
                  );
                })}
                <td className="py-2.5 pl-1.5 text-right">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                      score >= 100
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : score >= 50
                          ? "bg-primary/10 text-primary"
                          : "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                    )}
                  >
                    {score} %
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
