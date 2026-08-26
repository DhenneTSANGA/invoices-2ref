import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
  Plus,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useClients, useDocumentsList, useSession } from "@/hooks/use-data";
import { currency, shortDate } from "@/lib/format";
import type { Activity, Document } from "@/store/types";
import { canAccessDashboard } from "@/lib/roles";
import type { AppSession } from "@/lib/session.functions";
import {
  buildMonthlyRevenue,
  caGrowthPercent,
  computeMoneyTotals,
  type AmountBasis,
} from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — 2R Hub" },
      { name: "description", content: "Vue d'ensemble de votre activité." },
    ],
  }),
  beforeLoad: ({ context }) => {
    const session = (context as { session?: NonNullable<AppSession> }).session;
    if (session && !canAccessDashboard(session.staff.role)) {
      throw redirect({ to: "/home" });
    }
  },
  component: Dashboard,
});

const WEEKDAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function buildWeeklyDocs(documents: Document[]) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);

  return WEEKDAYS.map((d, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    return {
      d,
      factures: documents.filter(
        (doc) => doc.type === "invoice" && doc.issueDate === key,
      ).length,
      devis: documents.filter(
        (doc) => doc.type === "quotation" && doc.issueDate === key,
      ).length,
    };
  });
}

function buildActivities(
  documents: Document[],
  clients: { id: string; name: string; createdAt: string }[],
): Activity[] {
  const acts: Activity[] = [];
  for (const d of documents) {
    if (d.status === "paid") {
      acts.push({
        id: `${d.id}-paid`,
        kind: "invoice_paid",
        title: `Facture ${d.number} payée`,
        description: `${currency(d.total)} encaissés`,
        at: d.issueDate,
      });
    } else if (d.status === "overdue") {
      acts.push({
        id: `${d.id}-overdue`,
        kind: "invoice_overdue",
        title: `Facture ${d.number} en retard`,
        description: "Relance recommandée",
        at: d.dueDate ?? d.issueDate,
      });
    } else if (d.status === "sent" && d.type === "invoice") {
      acts.push({
        id: `${d.id}-sent`,
        kind: "invoice_sent",
        title: `Facture ${d.number} envoyée`,
        description: "En attente de règlement",
        at: d.issueDate,
      });
    } else if (d.status === "accepted" && d.type === "quotation") {
      acts.push({
        id: `${d.id}-accepted`,
        kind: "quotation_accepted",
        title: `Devis ${d.number} accepté`,
        description: "Prêt pour facturation",
        at: d.issueDate,
      });
    } else if (d.status === "sent" && d.type === "quotation") {
      acts.push({
        id: `${d.id}-qsent`,
        kind: "quotation_sent",
        title: `Devis ${d.number} envoyé`,
        description: "En attente de réponse",
        at: d.issueDate,
      });
    }
  }
  for (const c of clients.slice(-3)) {
    acts.push({
      id: `client-${c.id}`,
      kind: "client_added",
      title: "Nouveau client",
      description: c.name,
      at: c.createdAt,
    });
  }
  return acts.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
}

function BasisToggle({
  value,
  onChange,
}: {
  value: AmountBasis;
  onChange: (v: AmountBasis) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-border bg-surface/70 p-1 text-xs font-semibold">
      {(["ttc", "ht"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-xl px-3 py-1.5 transition-colors",
            value === opt
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Dashboard() {
  const { data: documents = [], isPending: loadingDocs } = useDocumentsList();
  const { data: clients = [], isPending: loadingClients } = useClients();
  const { data: session } = useSession();
  const [basis, setBasis] = useState<AmountBasis>("ttc");

  const money = useMemo(
    () => computeMoneyTotals(documents, basis),
    [documents, basis],
  );
  const revenueData = useMemo(
    () => buildMonthlyRevenue(documents, basis),
    [documents, basis],
  );
  const docsData = useMemo(() => buildWeeklyDocs(documents), [documents]);
  const activities = useMemo(
    () => buildActivities(documents, clients),
    [documents, clients],
  );
  const revenueGrowth = useMemo(
    () => caGrowthPercent(revenueData),
    [revenueData],
  );

  if (loadingDocs || loadingClients) {
    return (
      <LoadingState
        icon={TrendingUp}
        title="Chargement du tableau de bord"
        description="Agrégation des indicateurs et de l’activité récente…"
      />
    );
  }

  const invoices = documents.filter((d) => d.type === "invoice");
  const quotations = documents.filter((d) => d.type === "quotation");
  const basisHint = basis === "ht" ? "Montants HT" : "Montants TTC";

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
      <PageHeader
        title={`Bonjour ${session?.staff.firstName ?? "collaborateur"} 👋`}
        subtitle="Voici l'état de votre cabinet aujourd'hui."
        actions={
          <>
            <BasisToggle value={basis} onChange={setBasis} />
            <Link
              to="/quotations/new"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface/70 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted sm:flex-none sm:px-4"
            >
              <FileText className="h-4 w-4 shrink-0" />{" "}
              <span className="truncate">Nouveau devis</span>
            </Link>
            <Link
              to="/invoices/new"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-glow sm:flex-none sm:px-4"
            >
              <Plus className="h-4 w-4 shrink-0" /> Facture
            </Link>
          </>
        }
      />

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
          label="Devis actifs"
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
          transition={{ delay: 0.2 }}
          className="glass-panel min-w-0 overflow-hidden rounded-3xl p-4 sm:p-5 xl:col-span-2"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold sm:text-lg">
                Revenus mensuels
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
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--primary)" }}
              />
              Chiffre d&apos;affaires
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--success)" }}
              />
              Montant encaissé
            </span>
          </div>
          <div className="mt-4 h-64 w-full min-w-0 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="encGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--success)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--success)"
                      stopOpacity={0}
                    />
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
                  fill="url(#caGrad)"
                  animationDuration={1200}
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="collected"
                  stroke="var(--success)"
                  strokeWidth={2.5}
                  fill="url(#encGrad)"
                  animationDuration={1400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel rounded-3xl p-5"
        >
          <h3 className="font-display text-lg font-semibold">
            Statut des factures
          </h3>
          <p className="text-xs text-muted-foreground">Répartition actuelle</p>
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
                  animationDuration={900}
                >
                  {statusData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
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
          <div className="mt-4 rounded-2xl bg-gradient-mesh p-3 text-xs">
            Reste à encaisser :{" "}
            <b className="font-numeric">
              {currency(money.outstanding, "XAF")}
            </b>{" "}
            <span className="text-muted-foreground">({basis.toUpperCase()})</span>
          </div>
        </motion.div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-panel rounded-3xl p-5"
        >
          <h3 className="font-display text-lg font-semibold">
            Documents cette semaine
          </h3>
          <p className="text-xs text-muted-foreground">Devis & factures émis</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <BarChart data={docsData}>
                <CartesianGrid
                  strokeDasharray="3 6"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="d"
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
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="factures"
                  fill="var(--primary)"
                  radius={[8, 8, 0, 0]}
                  animationDuration={900}
                />
                <Bar
                  dataKey="devis"
                  fill="var(--accent)"
                  radius={[8, 8, 0, 0]}
                  animationDuration={1100}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel rounded-3xl p-5 xl:col-span-2"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">
              Documents récents
            </h3>
            <Link
              to="/invoices"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Voir tout <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
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
                {recent.map((d, i) => {
                  const client = clients.find((c) => c.id === d.clientId);
                  return (
                    <motion.tr
                      key={d.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="border-t border-border/40 hover:bg-muted/50"
                    >
                      <td className="px-4 py-2.5 font-medium">
                        <Link
                          to={
                            d.type === "invoice"
                              ? "/invoices/$id"
                              : "/quotations/$id"
                          }
                          params={{ id: d.id }}
                          className="hover:text-primary"
                        >
                          {d.number}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">{client?.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {shortDate(d.issueDate)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right font-numeric font-semibold">
                        {currency(
                          basis === "ht" ? d.subtotal : d.total,
                          "XAF",
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-panel mt-6 rounded-3xl p-5"
      >
        <h3 className="font-display text-lg font-semibold">Activité récente</h3>
        {activities.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Aucune activité pour le moment.
          </p>
        ) : (
          <ul className="mt-3 space-y-1">
            {activities.map((a, i) => (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex items-start gap-3 rounded-2xl p-3 transition-colors hover:bg-muted/50"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    a.kind.includes("paid") || a.kind.includes("accepted")
                      ? "bg-success/15 text-success"
                      : a.kind.includes("overdue")
                        ? "bg-danger/15 text-danger"
                        : "bg-primary/15 text-primary"
                  }`}
                >
                  {a.kind.includes("invoice") ? (
                    <ReceiptText className="h-4 w-4" />
                  ) : a.kind.includes("quotation") ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.description}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {shortDate(a.at)}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
