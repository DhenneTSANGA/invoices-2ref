import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Compass, Target, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import {
  MANAGERS,
  MONTHLY_BUDGET,
  OBJECTIVE_LABELS,
  computeKpis,
  managerName,
  realizedForMetric,
} from "@/lib/prospection-demo";
import { currency, shortDate } from "@/lib/format";
import { LineBadge, StageBadge } from "@/components/prospection/ProspectionBadges";
import { useRouteContext } from "@tanstack/react-router";
import { crmRoleFromStaff } from "@/lib/prospection-access";

export const Route = createFileRoute("/prospection/")({
  head: () => ({ meta: [{ title: "Dashboard — Prospection" }] }),
  component: ProspectionHomePage,
});

function ProspectionHomePage() {
  const { session } = useRouteContext({ from: "/prospection" });
  const crm = crmRoleFromStaff(session.staff.role);
  const data = useProspectionDemoStore((s) => s);
  const kpis = computeKpis(data);
  const first = session.staff.firstName || "Collaborateur";
  const pg = data.companies.filter((c) => c.site === "port_gentil" && c.strategic);
  const weekDone = data.activities.filter((a) => a.status === "terminee").length;
  const weekTodo = data.activities.filter(
    (a) => a.status === "a_faire" || a.status === "planifiee",
  ).length;

  return (
    <div>
      <PageHeader
        title={`Bonjour ${first}`}
        subtitle={
          crm === "direction"
            ? "Vue Direction — pipeline, budgets et Port-Gentil."
            : crm === "collaborateur"
              ? "Remontez une piste en moins d’une minute."
              : "Votre semaine commerciale et votre pipeline."
        }
        actions={
          <Link
            to="/prospection/pistes"
            className="inline-flex items-center rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
          >
            + Nouvelle piste
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Prospects" value={kpis.prospects} icon={Users} />
        <StatCard label="Pipeline pondéré" value={kpis.weighted} icon={Target} format={currency} />
        <StatCard label="CA signé" value={kpis.signedCa} icon={Compass} variant="success" format={currency} />
        <StatCard
          label="Budget cabinet"
          value={kpis.spent}
          icon={Wallet}
          variant={kpis.spent / kpis.budgetCap >= 0.8 ? "danger" : "accent"}
          format={currency}
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <section className="glass-panel rounded-3xl p-5">
          <h3 className="font-display font-semibold">Ma semaine commerciale</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Lundi — revue pipeline (30 min)</li>
            <li>Semaine — 5 contacts min. · 2 RDV</li>
            <li>Après RDV — CR sous 48 h + prochaine action</li>
            <li>RDV concluant — proposition sous 5 jours</li>
            <li>Vendredi — dépenses à jour</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            {weekDone} actions terminées · {weekTodo} restantes · {kpis.overdueActions.length} en retard
          </p>
        </section>
        <section className="glass-panel rounded-3xl p-5">
          <h3 className="font-display font-semibold">Objectifs 8 semaines</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data.objectives
              .filter((o) => o.managerId === "mgr-awa")
              .map((o) => {
                const done = realizedForMetric(data, o.metric, "mgr-awa");
                const pct = Math.round((done / o.target) * 100);
                return (
                  <li key={o.id}>
                    <div className="flex justify-between">
                      <span>{OBJECTIVE_LABELS[o.metric]}</span>
                      <span className="font-medium">
                        {done}/{o.target} ({pct}%)
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-gradient-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      </div>

      {kpis.overdueActions.length > 0 || kpis.staleStrategic.length > 0 || kpis.pendingApprovals.length > 0 ? (
        <section className="mb-5 rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-display font-semibold">
            <AlertTriangle className="h-4 w-4" /> Alertes
          </h3>
          <ul className="space-y-1 text-sm">
            {kpis.overdueActions.slice(0, 4).map((o) => (
              <li key={o.id}>
                Action en retard — {o.nextAction} ({shortDate(o.nextActionOn)})
              </li>
            ))}
            {kpis.staleStrategic.map((c) => (
              <li key={c.id}>Client stratégique sans contact 30 j. — {c.name}</li>
            ))}
            {kpis.pendingApprovals.map((e) => (
              <li key={e.id}>Dépense à valider — {currency(e.amount)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {crm !== "collaborateur" ? (
        <section className="glass-panel mb-5 overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
            <h3 className="font-display font-semibold">Port-Gentil — 6 clients</h3>
            <Link to="/prospection/port-gentil" className="text-sm text-primary hover:underline">
              Ouvrir
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Manager</th>
                  <th className="px-4 py-3 font-medium">Lignes</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                </tr>
              </thead>
              <tbody>
                {pg.map((a) => (
                  <tr key={a.id} className="border-t border-border/40">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{managerName(a.managerId)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {a.servicesBought.map((l) => (
                          <LineBadge key={l} line={l} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">{a.plan ? "Rédigé" : "À faire"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {crm === "direction" ? (
        <section className="glass-panel overflow-hidden rounded-3xl">
          <div className="border-b border-border/50 px-5 py-4">
            <h3 className="font-display font-semibold">Performance managers</h3>
          </div>
          <ul className="divide-y divide-border/40">
            {MANAGERS.map((m) => {
              const ops = data.opportunities.filter((o) => o.ownerId === m.id);
              const signed = ops.filter((o) => o.stage === "gagne");
              const spent = data.expenses.filter((e) => e.managerId === m.id).reduce((s, e) => s + e.amount, 0);
              return (
                <li key={m.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-muted-foreground">{signed.length} signée(s) · {currency(spent)} / {currency(MONTHLY_BUDGET)}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ops.slice(0, 3).map((o) => (
                      <StageBadge key={o.id} stage={o.stage} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
