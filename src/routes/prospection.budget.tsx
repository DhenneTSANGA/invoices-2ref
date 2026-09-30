import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Wallet } from "lucide-react";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import {
  BUDGET_ALERT_RATIO,
  EXPENSE_APPROVAL_THRESHOLD,
  EXPENSE_LABELS,
  MANAGERS,
  MONTHLY_BUDGET,
  managerName,
  type ExpenseCategory,
} from "@/lib/prospection-demo";
import { currency, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRouteContext } from "@tanstack/react-router";
import { canApproveExpenses, crmRoleFromStaff } from "@/lib/prospection-access";

const CATEGORIES = Object.keys(EXPENSE_LABELS) as ExpenseCategory[];

export const Route = createFileRoute("/prospection/budget")({
  head: () => ({ meta: [{ title: "Budget — Prospection" }] }),
  component: BudgetPage,
});

function BudgetPage() {
  const { session } = useRouteContext({ from: "/prospection" });
  const crm = crmRoleFromStaff(session.staff.role);
  const expenses = useProspectionDemoStore((s) => s.expenses);
  const companies = useProspectionDemoStore((s) => s.companies);
  const addExpense = useProspectionDemoStore((s) => s.addExpense);
  const setExpenseApproval = useProspectionDemoStore((s) => s.setExpenseApproval);
  const [managerId, setManagerId] = useState(MANAGERS[0].id);
  const [category, setCategory] = useState<ExpenseCategory>("relations");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("25000");
  const [receipt, setReceipt] = useState(true);

  const spentCabinet = expenses.reduce((s, e) => s + e.amount, 0);
  const capCabinet = MONTHLY_BUDGET * MANAGERS.length;

  return (
    <div>
      <PageHeader
        title="Dépenses & budget"
        subtitle={`${currency(MONTHLY_BUDGET)} / manager / mois · alerte ${BUDGET_ALERT_RATIO * 100}% · validation dès ${currency(EXPENSE_APPROVAL_THRESHOLD)}`}
      />
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
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        {MANAGERS.map((m) => {
          const spent = expenses.filter((e) => e.managerId === m.id).reduce((s, e) => s + e.amount, 0);
          const ratio = spent / MONTHLY_BUDGET;
          return (
            <article key={m.id} className="glass-panel rounded-3xl p-5">
              <div className="font-display font-semibold">{m.name}</div>
              <p className="mt-1 text-sm text-muted-foreground">{currency(spent)} / {currency(MONTHLY_BUDGET)}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", ratio >= BUDGET_ALERT_RATIO ? "bg-danger" : "bg-gradient-primary")} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
              </div>
            </article>
          );
        })}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Dépense</th>
              <th className="px-3 py-2">Montant</th>
              <th className="px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => {
              const co = companies.find((c) => c.id === e.companyId);
              return (
                <tr key={e.id} className="border-t border-border/40">
                  <td className="px-3 py-2 text-muted-foreground">{shortDate(e.at)}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{e.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {managerName(e.managerId)} · {EXPENSE_LABELS[e.category]}
                      {co ? ` · ${co.name}` : ""}
                      {e.receipt ? " · justificatif" : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium">{currency(e.amount)}</td>
                  <td className="px-3 py-2">
                    {e.approval === "pending" && canApproveExpenses(crm) ? (
                      <div className="flex gap-1">
                        <button type="button" className="rounded-lg bg-emerald-500/15 px-2 py-1 text-xs" onClick={() => setExpenseApproval(e.id, "approved")}>Valider</button>
                        <button type="button" className="rounded-lg bg-danger/10 px-2 py-1 text-xs" onClick={() => setExpenseApproval(e.id, "rejected")}>Refuser</button>
                      </div>
                    ) : (
                      <span className="text-xs">{e.approval === "none" ? "OK" : e.approval}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <form
          className="glass-panel space-y-3 rounded-3xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(amount.replace(/\s/g, ""));
            if (!label.trim() || !Number.isFinite(n) || n <= 0) {
              toast.error("Libellé et montant requis");
              return;
            }
            addExpense({
              managerId,
              category,
              label: label.trim(),
              amount: Math.round(n),
              at: new Date().toISOString().slice(0, 10),
              receipt,
            });
            setLabel("");
            toast.success(n > EXPENSE_APPROVAL_THRESHOLD ? "Soumise à validation Direction" : "Dépense enregistrée");
          }}
        >
          <h3 className="font-display font-semibold">Nouvelle dépense</h3>
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            {MANAGERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_LABELS[c]}</option>)}
          </select>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Libellé" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant FCFA" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={receipt} onChange={(e) => setReceipt(e.target.checked)} />
            Justificatif (photo simulée)
          </label>
          <button type="submit" className="w-full rounded-2xl bg-gradient-primary py-2 text-sm font-medium text-primary-foreground">Enregistrer</button>
        </form>
      </div>
    </div>
  );
}
