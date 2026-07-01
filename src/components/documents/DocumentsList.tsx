import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Eye, FileText, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAppStore } from "@/store/useAppStore";
import { currency, shortDate } from "@/lib/format";
import type { DocumentType } from "@/store/types";

const labels = {
  invoice: { title: "Factures", new: "/invoices/new", detail: "/invoices/$id", subtitle: "Suivi de vos factures émises" },
  quotation: { title: "Devis", new: "/quotations/new", detail: "/quotations/$id", subtitle: "Pipeline de propositions commerciales" },
  proforma: { title: "Pro forma", new: "/invoices/new", detail: "/invoices/$id", subtitle: "Documents proforma" },
} as const;

export function DocumentsList({ type }: { type: DocumentType }) {
  const docs = useAppStore((s) => s.documents.filter((d) => d.type === type));
  const clients = useAppStore((s) => s.clients);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const L = labels[type];

  const filtered = useMemo(() => docs.filter((d) => {
    const client = clients.find((c) => c.id === d.clientId);
    const matchQ = q === "" || `${d.number} ${client?.name ?? ""}`.toLowerCase().includes(q.toLowerCase());
    const matchS = status === "all" || d.status === status;
    return matchQ && matchS;
  }), [docs, clients, q, status]);

  const total = filtered.reduce((a, b) => a + b.total, 0);

  return (
    <div>
      <PageHeader
        title={L.title}
        subtitle={L.subtitle}
        actions={
          <Link to={L.new} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4" /> Nouveau
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Kpi label="Total documents" value={String(filtered.length)} />
        <Kpi label="Montant cumulé" value={currency(total)} />
        <Kpi label="En attente" value={String(filtered.filter((d) => d.status === "sent" || d.status === "draft").length)} />
      </div>

      <div className="glass-panel mb-4 flex flex-wrap items-center gap-3 rounded-2xl p-3">
        <div className="relative flex-1 min-w-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par numéro ou client…" className="w-full rounded-xl border border-border/60 bg-transparent pl-10 pr-3 py-2 text-sm focus:border-primary focus:outline-none" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-border/60 bg-surface px-3 py-2 text-sm">
          <option value="all">Tous les statuts</option>
          {(type === "invoice" ? ["draft", "sent", "paid", "overdue"] : ["draft", "sent", "accepted", "rejected"]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Aucun document" description="Aucun résultat ne correspond à votre recherche." />
      ) : (
        <div className="glass-panel overflow-hidden rounded-3xl">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left">Numéro</th>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Échéance</th>
                <th className="px-5 py-3 text-left">Statut</th>
                <th className="px-5 py-3 text-right">Montant</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const c = clients.find((x) => x.id === d.clientId);
                return (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    whileHover={{ scale: 1.005 }}
                    className="border-t border-border/40 hover:bg-muted/50"
                  >
                    <td className="px-5 py-3 font-medium font-numeric">{d.number}</td>
                    <td className="px-5 py-3">{c?.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{shortDate(d.issueDate)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{shortDate(d.dueDate)}</td>
                    <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-5 py-3 text-right font-numeric font-semibold">{currency(d.total)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link to={L.detail} params={{ id: d.id }} className="inline-flex items-center justify-center rounded-xl p-2 text-primary hover:bg-primary/10"><Eye className="h-4 w-4" /></Link>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel rounded-2xl px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  );
}
