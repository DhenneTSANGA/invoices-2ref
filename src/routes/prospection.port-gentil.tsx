import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { ACTIVE_STAGES, managerName } from "@/lib/prospection-demo";
import { currency, shortDate } from "@/lib/format";
import { LineBadge, StageBadge } from "@/components/prospection/ProspectionBadges";

export const Route = createFileRoute("/prospection/port-gentil")({
  head: () => ({ meta: [{ title: "Port-Gentil — Prospection" }] }),
  component: PortGentilPage,
});

function PortGentilPage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const activities = useProspectionDemoStore((s) => s.activities);
  const six = companies.filter((c) => c.site === "port_gentil" && c.strategic);

  return (
    <div>
      <PageHeader title="Port-Gentil" subtitle="Les 6 clients stratégiques — présence locale et ventes additionnelles." />
      <div className="space-y-4">
        {six.map((c) => {
          const ops = opportunities.filter((o) => o.companyId === c.id);
          const last = activities.filter((a) => a.companyId === c.id).map((a) => a.at).sort().at(-1);
          const next = ops.filter((o) => ACTIVE_STAGES.includes(o.stage)).sort((a, b) => a.nextActionOn.localeCompare(b.nextActionOn))[0];
          return (
            <article key={c.id} className="glass-panel rounded-3xl p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <Link to="/prospection/clients/$id" params={{ id: c.id }} className="font-display text-lg font-semibold hover:text-primary">
                    {c.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {managerName(c.managerId)} · plan {c.plan ? "rédigé" : "à faire"}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div>CA {currency(c.caSigned)}</div>
                  <div className="text-muted-foreground">Potentiel {currency(c.plan?.feePotential ?? 0)}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {c.servicesBought.map((l) => (
                  <LineBadge key={l} line={l} />
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Dernier contact {last ? shortDate(last) : "—"} · prochaine action {next ? `${next.nextAction} (${shortDate(next.nextActionOn)})` : "—"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {ops.map((o) => (
                  <StageBadge key={o.id} stage={o.stage} />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
