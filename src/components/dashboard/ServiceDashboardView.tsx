import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Banknote,
  FileText,
  Hourglass,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { currency, shortDate } from "@/lib/format";
import { documentDetailRoute } from "@/lib/document-nav";
import {
  buildMonthlyRevenue,
  caGrowthPercent,
  computeMoneyTotals,
  type AmountBasis,
} from "@/lib/dashboard-metrics";
import type { Client, Document } from "@/store/types";
import { CLIENT_POLE_LABELS, type ClientPole } from "@/lib/client-pole";

export function ServiceDashboardView({
  pole,
  documents,
  clients,
  basis,
}: {
  pole: ClientPole;
  documents: Document[];
  clients: Client[];
  basis: AmountBasis;
}) {
  const money = computeMoneyTotals(documents, basis);
  const revenueData = buildMonthlyRevenue(documents, basis);
  const revenueGrowth = caGrowthPercent(revenueData);
  const invoices = documents.filter((d) => d.type === "invoice");
  const quotations = documents.filter((d) => d.type === "quotation");
  const basisHint = basis === "ht" ? "Montants HT" : "Montants TTC";
  const label = CLIENT_POLE_LABELS[pole];
  const gradCa = `pole-ca-${pole}`;
  const gradEnc = `pole-enc-${pole}`;

  const statusData = [
    {
      name: "Payées",
      value: invoices.filter((d) => d.status === "paid").length,
      color: "var(--success)",
    },
    {
      name: "Envoyées",
      value: invoices.filter((d) => d.status === "sent").length,
      color: "var(--primary)",
    },
    {
      name: "En retard",
      value: invoices.filter((d) => d.status === "overdue").length,
      color: "var(--danger)",
    },
    {
      name: "Brouillon",
      value: invoices.filter((d) => d.status === "draft").length,
      color: "var(--muted-foreground)",
    },
  ];

  const recent = [...documents]
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
    .slice(0, 6);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Chiffre d'affaires"
          value={money.ca}
          variant="primary"
          icon={Wallet}
          hint={basisHint}
          format={(n) => currency(n, "XAF")}
          index={0}
        />
        <StatCard
          label="Montant encaissé"
          value={money.collected}
          variant="success"
          icon={Banknote}
          hint={basisHint}
          format={(n) => currency(n, "XAF")}
          index={1}
        />
        <StatCard
          label="Reste à encaisser"
          value={money.outstanding}
          variant={money.outstanding > 0 ? "danger" : "default"}
          icon={Hourglass}
          hint={basisHint}
          format={(n) => currency(n, "XAF")}
          index={2}
        />
        <StatCard label="Clients" value={clients.length} icon={Users} index={3} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Factures émises"
          value={invoices.length}
          icon={ReceiptText}
          index={4}
        />
        <StatCard
          label="Devis"
          value={quotations.length}
          variant="accent"
          icon={FileText}
          index={5}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel min-w-0 overflow-hidden rounded-3xl p-4 sm:p-5 xl:col-span-2"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold sm:text-lg">
                Revenus mensuels — {label}
              </h3>
              <p className="text-xs text-muted-foreground">
                CA émis vs montant encaissé ({basis.toUpperCase()}) — 6 derniers
                mois
              </p>
            </div>
            {revenueGrowth !== 0 && (
              <div
                className={`flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-medium ${
                  revenueGrowth >= 0
                    ? "bg-success/15 text-success"
                    : "bg-danger/15 text-danger"
                }`}
              >
                <TrendingUp className="h-3 w-3" />{" "}
                {revenueGrowth >= 0 ? "+" : ""}
                {revenueGrowth.toFixed(1)}%
              </div>
            )}
          </div>
          <div className="mt-4 h-64 w-full min-w-0 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id={gradCa} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={gradEnc} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 6"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="m"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [
                    currency(Number(value ?? 0), "XAF"),
                    name === "ca" ? "CA émis" : "Encaissé",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="ca"
                  name="ca"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill={`url(#${gradCa})`}
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="collected"
                  stroke="var(--success)"
                  strokeWidth={2.5}
                  fill={`url(#${gradEnc})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl p-5"
        >
          <h3 className="font-display text-lg font-semibold">
            Statut des factures
          </h3>
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="mt-2 h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  stroke="none"
                >
                  {statusData.map((d, i) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: s.color }}
                />
                {s.name} · <b>{s.value}</b>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel mt-6 rounded-3xl p-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">
            Documents récents
          </h3>
          <Link
            to="/invoices"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Voir les factures <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Aucun document pour le pôle {label}.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Numéro</th>
                  <th className="px-4 py-2 text-left">Client</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Statut</th>
                  <th className="px-4 py-2 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((d) => {
                  const client = clients.find((c) => c.id === d.clientId);
                  return (
                    <tr
                      key={d.id}
                      className="border-t border-border/40 hover:bg-muted/50"
                    >
                      <td className="px-4 py-2.5 font-medium">
                        <Link
                          {...documentDetailRoute(d)}
                          className="hover:text-primary"
                        >
                          {d.number}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">{client?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {shortDate(d.issueDate)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right font-numeric font-semibold">
                        {currency(basis === "ht" ? d.subtotal : d.total, "XAF")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
