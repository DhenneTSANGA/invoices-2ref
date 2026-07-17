import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Eye, Plus, Search, Send, Banknote, Ban, Filter, ReceiptText,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge, statusLabel } from "@/components/common/StatusBadge";
import { StaffAvatar } from "@/components/common/StaffAvatar";
import { useAppStore } from "@/store/useAppStore";
import { currency, shortDate } from "@/lib/format";
import type { DocumentStatus } from "@/store/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/invoices/")({
  head: () => ({ meta: [{ title: "Factures — FacturIA" }] }),
  component: InvoicesPage,
});

const INVOICE_STATUSES: DocumentStatus[] = ["draft", "sent", "paid", "overdue", "cancelled"];

function InvoicesPage() {
  const documents = useAppStore((s) => s.documents);
  const clients = useAppStore((s) => s.clients);
  const setDocumentStatus = useAppStore((s) => s.setDocumentStatus);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const docs = useMemo(
    () => documents.filter((d) => d.type === "invoice"),
    [documents],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: docs.length };
    for (const s of INVOICE_STATUSES) c[s] = docs.filter((d) => d.status === s).length;
    return c;
  }, [docs]);

  const filtered = useMemo(() => docs.filter((d) => {
    const client = clients.find((c) => c.id === d.clientId);
    const matchQ = q === "" || `${d.number} ${client?.name ?? ""}`.toLowerCase().includes(q.toLowerCase());
    const matchS = status === "all" || d.status === status;
    return matchQ && matchS;
  }), [docs, clients, q, status]);

  const total = filtered.reduce((a, b) => a + b.total, 0);

  const changeStatus = (id: string, next: DocumentStatus, number: string) => {
    setDocumentStatus(id, next);
    toast.success(`Facture ${number}`, { description: statusLabel(next) });
  };

  return (
    <div>
      <PageHeader
        title="Factures"
        subtitle="Suivi des factures — envoyées, payées, en retard ou annulées"
        actions={
          <Link to="/invoices/new" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4" /> Nouvelle facture
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatusCard label="Toutes" count={counts.all} active={status === "all"} onClick={() => setStatus("all")} accent="bg-slate-500" />
        {INVOICE_STATUSES.map((s) => (
          <StatusCard key={s} label={statusLabel(s)} count={counts[s] ?? 0} active={status === s} onClick={() => setStatus(s)} status={s} />
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Kpi label="Documents affichés" value={String(filtered.length)} />
        <Kpi label="Montant cumulé" value={currency(total)} />
        <Kpi
          label="En attente de paiement"
          value={currency(docs.filter((d) => d.status === "sent" || d.status === "overdue").reduce((a, b) => a + b.total, 0))}
        />
      </div>

      <div className="glass-panel mb-4 flex flex-wrap items-center gap-3 rounded-2xl p-3">
        <div className="relative flex-1 min-w-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par numéro ou client…"
            className="w-full rounded-xl border border-border/60 bg-transparent pl-10 pr-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          {status === "all" ? "Tous les statuts" : statusLabel(status as DocumentStatus)}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Aucune facture"
          description="Aucun document ne correspond à ce filtre."
          action={
            <Link to="/invoices/new" className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">
              Créer une facture
            </Link>
          }
        />
      ) : (
        <div className="glass-panel overflow-x-auto rounded-3xl">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left">Créateur</th>
                <th className="px-5 py-3 text-left">Numéro</th>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Échéance</th>
                <th className="px-5 py-3 text-left">Statut</th>
                <th className="px-5 py-3 text-right">Montant</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const c = clients.find((x) => x.id === d.clientId);
                const creator = d.createdBy;
                return (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn(
                      "border-t border-border/40 hover:bg-muted/50",
                      d.status === "cancelled" && "opacity-60",
                      d.status === "paid" && "bg-green-50/40",
                      d.status === "overdue" && "bg-red-50/30",
                      d.status === "sent" && "bg-sky-50/30",
                    )}
                  >
                    <td className="px-5 py-3">
                      {creator ? (
                        <Link to="/invoices/$id" params={{ id: d.id }} className="inline-flex">
                          <StaffAvatar person={creator} size="sm" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-medium font-numeric">
                      <Link to="/invoices/$id" params={{ id: d.id }} className="hover:text-primary hover:underline">
                        {d.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{c?.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{shortDate(d.issueDate)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{shortDate(d.dueDate)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                        <StatusBadge status={d.status} />
                        <select
                          value={d.status}
                          onChange={(e) => changeStatus(d.id, e.target.value as DocumentStatus, d.number)}
                          className="rounded-lg border border-border/60 bg-surface px-2 py-1 text-[11px]"
                        >
                          {INVOICE_STATUSES.map((s) => (
                            <option key={s} value={s}>{statusLabel(s)}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-numeric font-semibold">{currency(d.total)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {d.status !== "sent" && d.status !== "paid" && d.status !== "cancelled" && (
                          <IconBtn title="Envoyer" className="text-sky-600 hover:bg-sky-50" onClick={() => changeStatus(d.id, "sent", d.number)}>
                            <Send className="h-4 w-4" />
                          </IconBtn>
                        )}
                        {d.status !== "paid" && d.status !== "cancelled" && (
                          <IconBtn title="Marquer payée" className="text-green-600 hover:bg-green-50" onClick={() => changeStatus(d.id, "paid", d.number)}>
                            <Banknote className="h-4 w-4" />
                          </IconBtn>
                        )}
                        {d.status !== "cancelled" && (
                          <IconBtn title="Annuler" className="text-rose-600 hover:bg-rose-50" onClick={() => changeStatus(d.id, "cancelled", d.number)}>
                            <Ban className="h-4 w-4" />
                          </IconBtn>
                        )}
                        <Link
                          to="/invoices/$id"
                          params={{ id: d.id }}
                          title="Voir les détails"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition hover:bg-primary hover:text-primary-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
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

function StatusCard({
  label, count, active, onClick, status, accent,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  status?: DocumentStatus;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "glass-panel rounded-2xl p-3 text-left transition ring-2 ring-transparent hover:shadow-soft",
        active && "ring-primary shadow-glow",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {status ? (
          <StatusBadge status={status} />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            <span className={cn("h-1.5 w-1.5 rounded-full", accent)} />
            {label}
          </span>
        )}
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{count}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </button>
  );
}

function IconBtn({ title, onClick, className, children }: { title: string; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl transition", className)}>
      {children}
    </button>
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
