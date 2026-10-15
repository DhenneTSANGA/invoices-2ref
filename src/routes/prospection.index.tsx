import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
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
import { ObjectivesSummary } from "@/components/prospection/ObjectivesSummary";
import {
  computeKpis,
  managerName,
} from "@/lib/prospection-model";
import { currency, shortDate } from "@/lib/format";
import { canSeeAllPortfolios, crmRoleFromStaff } from "@/lib/prospection-access";
import { currentCrmMonth, monthLabelFr } from "@/lib/crm-month";
import {
  computeWeeklyAgenda,
  computeWeeklyRoutine,
  type AgendaItem,
  type RoutineItem,
  type RoutineStatus,
} from "@/lib/crm-weekly-routine";
import { ACTIVITY_LABELS, portfolioManagers, type Company } from "@/lib/prospection-model";
import { useProspectionStore } from "@/store/useProspectionStore";
import { useProspectionCompanies } from "@/hooks/use-prospection-companies";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prospection/")({
  head: () => ({ meta: [{ title: "Dashboard — Prospection" }] }),
  component: ProspectionHomePage,
});

function ProspectionHomePage() {
  const { session } = useRouteContext({ from: "/prospection" });
  const crm = crmRoleFromStaff(session.staff);
  const data = useProspectionStore((s) => s);
  const managers = data.managers;
  // Porteurs de portefeuille : managers désignés (sinon tous sauf la direction).
  const portfolio = portfolioManagers(managers);
  const monthlyCap = data.budgetSettings.monthlyBudgetPerManager;
  const { companies } = useProspectionCompanies();
  const kpis = computeKpis({ ...data, companies });
  const first = session.staff.firstName || "Collaborateur";
  const pg = companies.filter((c) => c.site === "port_gentil" && c.strategic);
  const agenda = computeWeeklyAgenda(data, session.staff.id);
  const routineManagers = portfolio;
  const budgetPct = Math.round((kpis.spent / kpis.budgetCap) * 100);
  const focusManagerId = session.staff.id;
  const seeAll = canSeeAllPortfolios(crm);
  const thisMonth = currentCrmMonth();
  const objectiveManagers = seeAll
    ? portfolio
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
                Semaine du {shortDate(agenda.weekKey)} — votre agenda et les prochaines étapes de
                vos opportunités
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MetricTile label="À faire" value={agenda.upcoming} accent />
            <MetricTile label="En retard" value={agenda.overdue.length} />
            <MetricTile label="Terminées" value={agenda.done} />
          </div>
          {agenda.overdue.length === 0 && agenda.days.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-muted/45 px-3 py-2.5 text-sm text-muted-foreground">
              Rien de prévu d’ici dimanche. Planifiez vos appels et RDV dans l’agenda, ou fixez la
              prochaine étape de vos opportunités.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {agenda.overdue.length > 0 ? (
                <AgendaGroup
                  title="En retard"
                  tone="late"
                  items={agenda.overdue}
                  companies={companies}
                  showDate
                />
              ) : null}
              {agenda.days.map((d) => (
                <AgendaGroup
                  key={d.date}
                  title={dayTitle(d.date, agenda.today)}
                  items={d.items}
                  companies={companies}
                />
              ))}
            </div>
          )}
        </CrmCard>

        <CrmCard className="h-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <IconMark icon={Target} tone="bg-violet-500/15 text-violet-700 dark:text-violet-300" />
              <div>
                <h2 className="font-display text-base font-semibold">Objectifs du mois</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="capitalize">{monthLabelFr(thisMonth)}</span>
                  {seeAll ? " · tous les managers" : " · vos indicateurs"}
                </p>
              </div>
            </div>
            <Link to="/prospection/objectifs" className="text-xs font-semibold text-primary hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="mt-4">
            <ObjectivesSummary
              data={data}
              managers={objectiveManagers}
              month={thisMonth}
              mode={seeAll ? "direction" : "self"}
            />
          </div>
        </CrmCard>
      </div>

      {seeAll ? (
        <CrmCard className="mb-5">
          <div className="flex items-start gap-3">
            <IconMark icon={CalendarDays} tone="bg-primary/15 text-primary" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-semibold">Routine des managers</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Semaine du {shortDate(agenda.weekKey)} — calculée depuis l’agenda, les opportunités et
                les dépenses de chaque manager.
              </p>
            </div>
          </div>
          {routineManagers.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-muted/45 px-3 py-2.5 text-sm text-muted-foreground">
              Aucun manager désigné : attribuez le profil « Manager de service » depuis la page
              Équipe.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Manager</th>
                    <th className="px-2 py-2 font-semibold">À faire</th>
                    <th className="px-2 py-2 font-semibold">En retard</th>
                    {ROUTINE_KEYS.map((key) => (
                      <th key={key} className="px-2 py-2 font-semibold">
                        {ROUTINE_SHORT_LABELS[key]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {routineManagers.map((m) => {
                    const r = computeWeeklyRoutine(data, m.id);
                    const a = computeWeeklyAgenda(data, m.id);
                    return (
                      <tr key={m.id} className="border-t border-border/50">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <EntityMark name={m.name} size="sm" />
                            <span className="font-medium">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 tabular-nums">{a.upcoming}</td>
                        <td
                          className={cn(
                            "px-2 py-2.5 tabular-nums",
                            a.overdue.length > 0 && "font-semibold text-danger",
                          )}
                        >
                          {a.overdue.length}
                        </td>
                        {r.map((i) => (
                          <td key={i.key} className="px-2 py-2.5" title={i.detail}>
                            <StatusDot status={i.status} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CrmCard>
      ) : null}

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
            {portfolio.map((m, i) => {
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

const ROUTINE_KEYS: RoutineItem["key"][] = ["contacts", "reports", "proposals", "expenses"];

const ROUTINE_SHORT_LABELS: Record<RoutineItem["key"], string> = {
  contacts: "5 contacts · 2 RDV",
  reports: "CR 48 h",
  proposals: "Proposition 5 j",
  expenses: "Dépenses",
};

const STATUS_STYLES: Record<RoutineStatus, { dot: string; label: string }> = {
  ok: { dot: "bg-emerald-500", label: "Tenu" },
  pending: { dot: "bg-amber-400", label: "En cours" },
  late: { dot: "bg-danger", label: "En retard" },
};

function StatusDot({ status }: { status: RoutineStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("h-2.5 w-2.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

function dayTitle(date: string, today: string): string {
  if (date === today) return "Aujourd’hui";
  const tomorrow = new Date(`${today}T12:00:00.000Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (date === tomorrow.toISOString().slice(0, 10)) return "Demain";
  const label = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Un jour de la semaine (ou le retard) : actions d’agenda et prochaines étapes d’opportunités. */
function AgendaGroup({
  title,
  items,
  companies,
  tone,
  showDate,
}: {
  title: string;
  items: AgendaItem[];
  companies: Company[];
  tone?: "late";
  showDate?: boolean;
}) {
  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";
  return (
    <section>
      <h3
        className={cn(
          "mb-1.5 text-[11px] font-semibold uppercase tracking-wider",
          tone === "late" ? "text-danger" : "text-muted-foreground",
        )}
      >
        {title} · {items.length}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const isActivity = item.source === "activity";
          const key = isActivity ? `a-${item.activity.id}` : `o-${item.opportunity.id}`;
          const company = companyName(
            isActivity ? item.activity.companyId : item.opportunity.companyId,
          );
          const when = [showDate ? shortDate(item.date) : "", isActivity ? item.time : ""]
            .filter(Boolean)
            .join(" · ");
          const row = cn(
            "flex items-start gap-3 rounded-2xl border px-3 py-2 text-sm transition-colors",
            tone === "late"
              ? "border-danger/15 bg-danger/5 hover:bg-danger/10"
              : "border-border/50 bg-muted/30 hover:bg-muted/50",
          );
          return (
            <li key={key}>
              {isActivity ? (
                <Link to="/prospection/agenda" className={row}>
                  <span className="mt-0.5 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    {ACTIVITY_LABELS[item.activity.kind]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.activity.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {company}
                      {when ? ` · ${when}` : ""}
                    </span>
                  </span>
                </Link>
              ) : (
                <Link
                  to="/prospection/opportunites"
                  search={{ focus: item.opportunity.id }}
                  className={row}
                >
                  <span className="mt-0.5 shrink-0">
                    <StageBadge stage={item.opportunity.stage} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {item.opportunity.nextAction || "Prochaine étape à préciser"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {company} · {item.opportunity.title}
                      {when ? ` · ${when}` : ""}
                    </span>
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
