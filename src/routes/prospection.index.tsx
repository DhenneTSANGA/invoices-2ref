import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Compass,
  Plus,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { LineBadge, StageBadge } from "@/components/prospection/ProspectionBadges";
import {
  CompanyDialog,
  NewActivityDialog,
  NewExpenseDialog,
  NewLeadDialog,
} from "@/components/prospection/CrmForms";
import {
  CrmCard,
  CrmCardGrid,
  EntityMark,
  IconMark,
  MetricTile,
  ProgressMeter,
} from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN } from "@/components/prospection/CrmUi";
import {
  OBJECTIVE_LABELS,
  computeKpis,
  managerName,
  realizedForMetric,
} from "@/lib/prospection-demo";
import { currency, shortDate } from "@/lib/format";
import { canSeeAllPortfolios, crmRoleFromStaff } from "@/lib/prospection-access";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { useProspectionCompanies } from "@/hooks/use-prospection-companies";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prospection/")({
  head: () => ({ meta: [{ title: "Dashboard — Prospection" }] }),
  component: ProspectionHomePage,
});

function ProspectionHomePage() {
  const { session } = useRouteContext({ from: "/prospection" });
  const crm = crmRoleFromStaff(session.staff.role);
  const data = useProspectionDemoStore((s) => s);
  const managers = data.managers;
  const monthlyCap = data.budgetSettings.monthlyBudgetPerManager;
  const { companies } = useProspectionCompanies();
  const toggleWeekCheck = useProspectionDemoStore((s) => s.toggleWeekCheck);
  const kpis = computeKpis({ ...data, companies });
  const first = session.staff.firstName || "Collaborateur";
  const pg = companies.filter((c) => c.site === "port_gentil" && c.strategic);
  const weekDone = data.activities.filter((a) => a.status === "terminee").length;
  const weekTodo = data.activities.filter(
    (a) => a.status === "a_faire" || a.status === "planifiee",
  ).length;
  const weekChecksDone = data.weekChecks.filter((w) => w.done).length;
  const budgetPct = Math.round((kpis.spent / kpis.budgetCap) * 100);
  const focusManagerId = session.staff.id;
  const seeAll = canSeeAllPortfolios(crm);
  const objectiveManagers = seeAll
    ? managers
    : managers.filter((m) => m.id === focusManagerId);
  const [leadOpen, setLeadOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [prospectOpen, setProspectOpen] = useState(false);
  const hasAlerts =
    kpis.overdueActions.length > 0 || kpis.staleStrategic.length > 0 || kpis.pendingApprovals.length > 0;

  return (
    <div>
      <PageHeader
        title={`Bonjour ${first}`}
        subtitle={
          seeAll
            ? "Pilotage Prospection — pipeline, budgets et portefeuille."
            : "Votre semaine commerciale et votre pipeline."
        }
        actions={
          <>
            <button type="button" onClick={() => setLeadOpen(true)} className={CRM_PRIMARY_BTN}>
              <Plus className="h-4 w-4" />
              Nouvelle piste
            </button>
            {crm !== "collaborateur" ? (
              <>
                <button type="button" onClick={() => setActivityOpen(true)} className={CRM_SECONDARY_BTN}>
                  <Plus className="h-4 w-4" />
                  Activité
                </button>
                <button type="button" onClick={() => setExpenseOpen(true)} className={CRM_SECONDARY_BTN}>
                  <Plus className="h-4 w-4" />
                  Dépense
                </button>
                <button type="button" onClick={() => setProspectOpen(true)} className={CRM_SECONDARY_BTN}>
                  <Plus className="h-4 w-4" />
                  Prospect
                </button>
              </>
            ) : null}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/prospection/prospects" className="block h-full">
          <StatCard
            label="Prospects"
            value={kpis.prospects}
            icon={Users}
            hint={`${kpis.clients} clients en portefeuille`}
            index={0}
          />
        </Link>
        <Link to="/prospection/opportunites" className="block h-full">
          <StatCard
            label="Pipeline pondéré"
            value={kpis.weighted}
            icon={Target}
            format={currency}
            hint={`${kpis.opportunities} affaire(s) ouverte(s)`}
            index={1}
          />
        </Link>
        <Link to="/prospection/opportunites" className="block h-full">
          <StatCard
            label="CA signé"
            value={kpis.signedCa}
            icon={Compass}
            variant="success"
            format={currency}
            hint={`${kpis.signatures} mission(s)`}
            index={2}
          />
        </Link>
        <Link to="/prospection/budget" className="block h-full">
          <StatCard
            label="Budget cabinet"
            value={kpis.spent}
            icon={Wallet}
            variant={kpis.spent / kpis.budgetCap >= 0.8 ? "danger" : "accent"}
            format={currency}
            hint={`${budgetPct} % de ${currency(kpis.budgetCap)}`}
            index={3}
          />
        </Link>
      </div>

      {hasAlerts ? (
        <CrmCard className="mb-5" accent="bg-danger" index={2}>
          <div className="flex items-start gap-3">
            <IconMark icon={AlertTriangle} tone="bg-danger/10 text-danger" />
            <div>
              <h2 className="font-display text-base font-semibold">Alertes</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {kpis.overdueActions.length + kpis.staleStrategic.length + kpis.pendingApprovals.length} point(s)
                à traiter
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {kpis.overdueActions.slice(0, 4).map((o) => {
              const co = companies.find((c) => c.id === o.companyId);
              return (
                <li key={o.id}>
                  <Link
                    to="/prospection/opportunites"
                    search={{ focus: o.id }}
                    className="block rounded-2xl border border-danger/15 bg-danger/5 px-3 py-2.5 text-sm hover:bg-danger/10"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-danger">
                      Action en retard
                    </span>
                    <div className="mt-0.5 font-medium">
                      {co?.name} · {o.nextAction}
                    </div>
                    <div className="text-xs text-muted-foreground">{shortDate(o.nextActionOn)}</div>
                  </Link>
                </li>
              );
            })}
            {kpis.staleStrategic.map((c) => (
              <li key={c.id}>
                <Link
                  to="/prospection/clients/$id"
                  params={{ id: c.id }}
                  search={{ focus: c.id }}
                  className="block rounded-2xl border border-amber-500/20 bg-amber-500/8 px-3 py-2.5 text-sm hover:bg-amber-500/12"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Client stratégique
                  </span>
                  <div className="mt-0.5 font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">Sans contact depuis 30 jours</div>
                </Link>
              </li>
            ))}
            {kpis.pendingApprovals.map((e) => (
              <li key={e.id}>
                <Link
                  to="/prospection/budget"
                  search={{ focus: e.id }}
                  className="block rounded-2xl border border-primary/15 bg-primary/5 px-3 py-2.5 text-sm hover:bg-primary/10"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Dépense à valider
                  </span>
                  <div className="mt-0.5 font-medium">{e.label}</div>
                  <div className="text-xs text-muted-foreground">{currency(e.amount)}</div>
                </Link>
              </li>
            ))}
          </ul>
        </CrmCard>
      ) : null}

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <CrmCard className="h-full">
          <div className="flex items-start gap-3">
            <IconMark icon={CalendarDays} tone="bg-primary/15 text-primary" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-semibold">Ma semaine commerciale</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {weekChecksDone}/{data.weekChecks.length} points de routine
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MetricTile label="Terminées" value={weekDone} accent />
            <MetricTile label="Restantes" value={weekTodo} />
            <MetricTile label="En retard" value={kpis.overdueActions.length} />
          </div>
          <ul className="mt-4 space-y-2">
            {data.weekChecks.map((item) => (
              <li key={item.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 text-sm transition-colors",
                    item.done
                      ? "border-emerald-500/20 bg-emerald-500/8 text-muted-foreground"
                      : "border-border/50 bg-muted/30 hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      item.done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border bg-background",
                    )}
                  >
                    {item.done ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => {
                      void toggleWeekCheck(item.id).catch((err) =>
                        toast.error(err instanceof Error ? err.message : "Mise à jour impossible"),
                      );
                    }}
                    className="sr-only"
                  />
                  <span className={cn("leading-snug", item.done && "line-through")}>{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </CrmCard>

        <CrmCard className="h-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <IconMark icon={Target} tone="bg-violet-500/15 text-violet-700 dark:text-violet-300" />
              <div>
                <h2 className="font-display text-base font-semibold">Objectifs 8 semaines</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Réalisé calculé automatiquement</p>
              </div>
            </div>
            <Link to="/prospection/objectifs" className="text-xs font-semibold text-primary hover:underline">
              Voir tout
            </Link>
          </div>
          <div className={cn("mt-4 space-y-4", objectiveManagers.length > 1 && "space-y-5")}>
            {objectiveManagers.map((m) => (
              <div key={m.id}>
                {objectiveManagers.length > 1 ? (
                  <div className="mb-2 flex items-center gap-2">
                    <EntityMark name={m.name} size="sm" />
                    <span className="text-sm font-semibold">{m.name}</span>
                  </div>
                ) : null}
                <ul className="space-y-2">
                  {data.objectives
                    .filter((o) => o.managerId === m.id)
                    .map((o) => {
                      const done = realizedForMetric(data, o.metric, m.id);
                      const pct = o.target === 0 ? 0 : Math.round((done / o.target) * 100);
                      return (
                        <li key={o.id} className="rounded-2xl bg-muted/45 px-3 py-2.5">
                          <ProgressMeter
                            value={pct}
                            label={OBJECTIVE_LABELS[o.metric]}
                            hint={`${done}/${o.target} · ${pct} %`}
                          />
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
        </CrmCard>
      </div>

      {crm !== "collaborateur" ? (
        <section className="mb-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-display font-semibold">Port-Gentil — 6 clients</h3>
            <Link to="/prospection/port-gentil" className="text-xs font-semibold text-primary hover:underline">
              Ouvrir
            </Link>
          </div>
          <CrmCardGrid>
            {pg.map((a, i) => (
              <Link key={a.id} to="/prospection/clients/$id" params={{ id: a.id }} className="block h-full">
                <CrmCard index={i} className="h-full">
                  <div className="flex items-start gap-3">
                    <EntityMark name={a.name} />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-base font-semibold leading-tight group-hover:text-primary">
                        {a.name}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">{managerName(a.managerId)}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.servicesBought.map((l) => (
                          <LineBadge key={l} line={l} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MetricTile label="CA signé" value={currency(a.caSigned)} accent />
                    <MetricTile
                      label="Plan de compte"
                      value={a.plan ? "Rédigé" : "À faire"}
                      hint={a.plan ? currency(a.plan.feePotential) : "Potentiel à estimer"}
                    />
                  </div>
                </CrmCard>
              </Link>
            ))}
          </CrmCardGrid>
        </section>
      ) : null}

      {seeAll ? (
        <section>
          <h3 className="mb-3 font-display font-semibold">Performance managers</h3>
          <CrmCardGrid>
            {managers.map((m, i) => {
              const ops = data.opportunities.filter((o) => o.ownerId === m.id);
              const signed = ops.filter((o) => o.stage === "gagne");
              const signedCa = signed.reduce((s, o) => s + o.amount, 0);
              const spent = data.expenses.filter((e) => e.managerId === m.id).reduce((s, e) => s + e.amount, 0);
              const ratio = spent / monthlyCap;
              return (
                <CrmCard key={m.id} index={i} className="h-full" accent={ratio >= data.budgetSettings.alertRatio ? "bg-danger" : undefined}>
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
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MetricTile
                      label="Signé"
                      value={currency(signedCa)}
                      hint={`${signed.length} mission(s)`}
                      accent
                    />
                    <MetricTile label="Budget" value={currency(spent)} hint={`/ ${currency(monthlyCap)}`} />
                  </div>
                  <div className="mt-4">
                    <ProgressMeter
                      value={Math.round(ratio * 100)}
                      label="Consommation"
                      hint={`${Math.round(ratio * 100)} %`}
                    />
                  </div>
                  {ops.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {ops.slice(0, 4).map((o) => (
                        <StageBadge key={o.id} stage={o.stage} />
                      ))}
                    </div>
                  ) : null}
                </CrmCard>
              );
            })}
          </CrmCardGrid>
        </section>
      ) : null}

      <NewLeadDialog open={leadOpen} onOpenChange={setLeadOpen} />
      <NewActivityDialog open={activityOpen} onOpenChange={setActivityOpen} />
      <NewExpenseDialog open={expenseOpen} onOpenChange={setExpenseOpen} />
      <CompanyDialog open={prospectOpen} onOpenChange={setProspectOpen} kind="prospect" />
    </div>
  );
}
