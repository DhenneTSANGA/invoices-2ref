import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { MANAGERS, OBJECTIVE_LABELS, realizedForMetric } from "@/lib/prospection-demo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prospection/objectifs")({
  head: () => ({ meta: [{ title: "Objectifs — Prospection" }] }),
  component: ObjectivesPage,
});

function ObjectivesPage() {
  const data = useProspectionDemoStore((s) => s);

  return (
    <div>
      <PageHeader title="Objectifs" subtitle="8 semaines — Objectif → Réalisé → % → Écart. Calculé sur le pipeline démo." />
      <div className="space-y-4">
        {MANAGERS.map((m) => (
          <section key={m.id} className="glass-panel rounded-3xl p-5">
            <h3 className="font-display font-semibold">{m.name}</h3>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Indicateur</th>
                  <th>Objectif</th>
                  <th>Réalisé</th>
                  <th>%</th>
                  <th>Écart</th>
                </tr>
              </thead>
              <tbody>
                {data.objectives
                  .filter((o) => o.managerId === m.id)
                  .map((o) => {
                    const done = realizedForMetric(data, o.metric, m.id);
                    const pct = Math.round((done / o.target) * 100);
                    const gap = done - o.target;
                    return (
                      <tr key={o.id} className="border-t border-border/40">
                        <td className="py-2">{OBJECTIVE_LABELS[o.metric]}</td>
                        <td>{o.target}</td>
                        <td>{done}</td>
                        <td>{pct}%</td>
                        <td className={cn(gap >= 0 ? "text-emerald-700" : "text-danger")}>{gap}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}
