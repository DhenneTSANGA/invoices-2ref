import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { managerName } from "@/lib/prospection-demo";
import { currency } from "@/lib/format";
import { LineBadge } from "@/components/prospection/ProspectionBadges";

export const Route = createFileRoute("/prospection/strategiques")({
  head: () => ({ meta: [{ title: "Clients stratégiques — Prospection" }] }),
  component: StrategicPage,
});

function StrategicPage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const list = companies.filter((c) => c.kind === "client" && c.strategic);

  return (
    <div>
      <PageHeader title="Clients stratégiques" subtitle="Chaque fiche a un plan de compte." />
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((c) => (
          <Link key={c.id} to="/prospection/clients/$id" params={{ id: c.id }} className="glass-panel rounded-3xl p-5 hover:shadow-float">
            <h3 className="font-display text-lg font-semibold">{c.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{managerName(c.managerId)}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {c.servicesBought.map((l) => (
                <LineBadge key={l} line={l} />
              ))}
            </div>
            {c.plan ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {c.plan.stakes} · potentiel {currency(c.plan.feePotential)}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
