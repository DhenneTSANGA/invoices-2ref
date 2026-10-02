import { createFileRoute, useNavigate, useRouteContext } from "@tanstack/react-router";
import { Plus, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { NewExpenseDialog } from "@/components/prospection/CrmForms";
import {
  CrmCard,
  CrmCardGrid,
  DateTile,
  EntityMark,
  MetricTile,
  ProgressMeter,
} from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN, CrmSearchEmpty, CrmSearchField, matchesSearch } from "@/components/prospection/CrmUi";
import {
  BUDGET_ALERT_RATIO,
  EXPENSE_APPROVAL_LABELS,
  EXPENSE_APPROVAL_THRESHOLD,
  EXPENSE_LABELS,
  MANAGERS,
  MONTHLY_BUDGET,
  managerName,
  type ExpenseApproval,
} from "@/lib/prospection-demo";
import { currency, shortDate } from "@/lib/format";
import { readFocusSearch, useSpotlight } from "@/hooks/use-spotlight";
import { cn } from "@/lib/utils";
import { canApproveExpenses, crmRoleFromStaff } from "@/lib/prospection-access";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/budget")({
  validateSearch: readFocusSearch,
  head: () => ({ meta: [{ title: "Budget — Prospection" }] }),
  component: BudgetPage,
});

const APPROVAL_CLASS: Record<ExpenseApproval, string> = {
  none: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-danger/10 text-danger",
};

function BudgetPage() {
  const navigate = useNavigate();
  const { focus } = Route.useSearch();
  useSpotlight(focus, () => {
    void navigate({
      to: "/prospection/budget",
      search: { focus: undefined },
      replace: true,
      resetScroll: false,
    });
  });
  const { session } = useRouteContext({ from: "/prospection" });
  const crm = crmRoleFromStaff(session.staff.role);
  const canApprove = canApproveExpenses(crm);
  const expenses = useProspectionDemoStore((s) => s.expenses);
  const companies = useProspectionDemoStore((s) => s.companies);
  const setExpenseApproval = useProspectionDemoStore((s) => s.setExpenseApproval);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const matchesExpense = useMemo(() => {
    return (id: string) => {
      const expense = expenses.find((e) => e.id === id);
      if (!expense) return false;
      if (expense.id === focus) return true;
      const co = companies.find((c) => c.id === expense.companyId);
      return matchesSearch(
        query,
        expense.label,
        expense.amount,
        managerName(expense.managerId),
        EXPENSE_LABELS[expense.category],
        EXPENSE_APPROVAL_LABELS[expense.approval],
        co?.name,
      );
    };
  }, [expenses, companies, query, focus]);

  const pending = useMemo(
    () => expenses.filter((e) => e.approval === "pending" && matchesExpense(e.id)),
    [expenses, matchesExpense],
  );
  const journal = useMemo(() => expenses.filter((e) => matchesExpense(e.id)), [expenses, matchesExpense]);
  const managers = useMemo(
    () =>
      MANAGERS.filter((m) => {
        if (!query.trim()) return true;
        if (matchesSearch(query, m.name)) return true;
        return expenses.some((e) => e.managerId === m.id && e.id !== focus && matchesExpense(e.id));
      }),
    [query, expenses, focus, matchesExpense],
  );

  const spentCabinet = expenses.reduce((s, e) => s + e.amount, 0);
  const capCabinet = MONTHLY_BUDGET * MANAGERS.length;

  return (
    <div>
      <PageHeader
        title="Dépenses & budget"
        subtitle={`${currency(MONTHLY_BUDGET)} / manager / mois · alerte ${BUDGET_ALERT_RATIO * 100}% · validation dès ${currency(EXPENSE_APPROVAL_THRESHOLD)}`}
        actions={
          <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
            <Plus className="h-4 w-4" />
            Nouvelle dépense
          </button>
        }
      />
      <CrmSearchField
        value={query}
        onChange={setQuery}
        label="Rechercher une dépense"
        placeholder="Rechercher un libellé, un manager, une catégorie…"
      />

      {canApprove && pending.length > 0 ? (
        <section className="mb-5">
          <h3 className="mb-3 font-display font-semibold">À valider Direction ({pending.length})</h3>
          <CrmCardGrid dense>
            {pending.map((e, i) => (
              <CrmCard
                key={e.id}
                index={i}
                accent="bg-amber-500"
                className="h-full"
                spotId={e.id}
                spotlight={focus === e.id}
              >
                <div className="flex items-start gap-3">
                  <DateTile iso={e.at} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-base font-semibold leading-tight">{e.label}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {managerName(e.managerId)} · {EXPENSE_LABELS[e.category]}
                    </p>
                    <p className="mt-2 font-display text-lg font-semibold tabular-nums">{currency(e.amount)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => {
                      setExpenseApproval(e.id, "approved");
                      toast.success("Dépense validée");
                    }}
                  >
                    Valider
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-danger px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => {
                      setExpenseApproval(e.id, "rejected");
                      toast.success("Dépense refusée");
                    }}
                  >
                    Refuser
                  </button>
                </div>
              </CrmCard>
            ))}
          </CrmCardGrid>
        </section>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Consommé cabinet" value={spentCabinet} icon={Wallet} format={currency} />
        <StatCard label="Enveloppe mois" value={capCabinet} icon={Wallet} variant="accent" format={currency} />
        <StatCard
          label="% consommé"
          value={Math.round((spentCabinet / capCabinet) * 100)}
          icon={Wallet}
          variant={spentCabinet / capCabinet >= BUDGET_ALERT_RATIO ? "danger" : "default"}
          suffix=" %"
        />
      </div>

      {managers.length > 0 ? (
      <div className="mb-5">
        <CrmCardGrid>
          {managers.map((m, i) => {
          const spent = expenses.filter((e) => e.managerId === m.id).reduce((s, e) => s + e.amount, 0);
          const ratio = spent / MONTHLY_BUDGET;
          const remaining = Math.max(0, MONTHLY_BUDGET - spent);
          return (
            <CrmCard
              key={m.id}
              index={i}
              className="h-full"
              accent={ratio >= BUDGET_ALERT_RATIO ? "bg-danger" : undefined}
            >
              <div className="flex items-start gap-3">
                <EntityMark name={m.name} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-semibold">{m.name}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Enveloppe mensuelle</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MetricTile label="Consommé" value={currency(spent)} accent={ratio >= BUDGET_ALERT_RATIO} />
                <MetricTile label="Restant" value={currency(remaining)} />
              </div>
              <div className="mt-4">
                <ProgressMeter
                  value={Math.round(ratio * 100)}
                  label={ratio >= BUDGET_ALERT_RATIO ? "Alerte 80 %" : "Consommation"}
                  hint={`${Math.round(ratio * 100)} %`}
                />
              </div>
            </CrmCard>
          );
        })}
        </CrmCardGrid>
      </div>
      ) : null}

      {journal.length === 0 ? (
        <CrmSearchEmpty
          title="Aucune dépense"
          description="Aucune dépense ne correspond à cette recherche."
          onClear={query ? () => setQuery("") : undefined}
        />
      ) : (
      <>
      <h3 className="mb-3 font-display font-semibold">Journal des dépenses</h3>
      <CrmCardGrid dense>
        {journal.map((e, i) => {
          const co = companies.find((c) => c.id === e.companyId);
          return (
            <CrmCard
              key={e.id}
              index={i}
              className="h-full"
              spotId={canApprove && e.approval === "pending" ? undefined : e.id}
              spotlight={focus === e.id && !(canApprove && e.approval === "pending")}
            >
              <div className="flex items-start gap-3">
                <DateTile iso={e.at} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-display text-base font-semibold leading-tight">{e.label}</h2>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        APPROVAL_CLASS[e.approval],
                      )}
                    >
                      {EXPENSE_APPROVAL_LABELS[e.approval]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {managerName(e.managerId)} · {EXPENSE_LABELS[e.category]}
                    {co ? ` · ${co.name}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MetricTile label="Montant" value={currency(e.amount)} accent />
                <MetricTile
                  label="Justificatif"
                  value={e.receipt ? "Joint" : "À joindre"}
                  hint={shortDate(e.at)}
                />
              </div>
            </CrmCard>
          );
        })}
      </CrmCardGrid>
      </>
      )}

      <NewExpenseDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
