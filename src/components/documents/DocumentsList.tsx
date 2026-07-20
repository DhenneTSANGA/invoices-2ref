import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Eye, FileText, Plus, Search, Send, Banknote, XCircle, CheckCircle2, Ban } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge, statusLabel } from "@/components/common/StatusBadge";
import { currency, shortDate } from "@/lib/format";
import type { DocumentStatus, DocumentType } from "@/store/types";
import { cn } from "@/lib/utils";
import {
  useClients,
  useDocuments,
  useSetDocumentStatus,
} from "@/hooks/use-data";

const labels = {
  invoice: { title: "Factures", new: "/invoices/new", detail: "/invoices/$id", subtitle: "Suivi de vos factures émises" },
  quotation: { title: "Devis", new: "/quotations/new", detail: "/quotations/$id", subtitle: "Pipeline de propositions commerciales" },
  proforma: { title: "Pro forma", new: "/proformas/new", detail: "/proformas/$id", subtitle: "Estimations sans valeur comptable" },
  letter: { title: "Lettres", new: "/letters/new", detail: "/letters/$id", subtitle: "Courriers commerciaux" },
} as const;

const invoiceStatuses: DocumentStatus[] = ["draft", "sent", "paid", "overdue", "cancelled"];
const quotationStatuses: DocumentStatus[] = ["draft", "sent", "accepted", "rejected", "cancelled"];
const proformaStatuses: DocumentStatus[] = ["draft", "sent", "cancelled"];
const letterStatuses: DocumentStatus[] = ["draft", "sent", "cancelled"];

function statusesFor(type: DocumentType): DocumentStatus[] {
  if (type === "invoice") return invoiceStatuses;
  if (type === "quotation") return quotationStatuses;
  if (type === "proforma") return proformaStatuses;
  return letterStatuses;
}

export function DocumentsList({ type }: { type: DocumentType }) {
  const { data: documents = [], isLoading } = useDocuments(type);
  const { data: clients = [] } = useClients();
  const setStatusMutation = useSetDocumentStatus();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const L = labels[type];
  const statusOptions = statusesFor(type);

  const docs = useMemo(() => documents, [documents]);

  const filtered = useMemo(() => docs.filter((d) => {
    const client = clients.find((c) => c.id === d.clientId);
    const matchQ = q === "" || `${d.number} ${client?.name ?? ""}`.toLowerCase().includes(q.toLowerCase());
    const matchS = status === "all" || d.status === status;
    return matchQ && matchS;
  }), [docs, clients, q, status]);

  const total = filtered.reduce((a, b) => a + b.total, 0);

  const setStatusWithToast = (id: string, next: DocumentStatus, number: string) => {
    setStatusMutation.mutate(
      { id, status: next },
      {
        onSuccess: () =>
          toast.success(`Statut mis à jour — ${number}`, {
            description: statusLabel(next),
          }),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Chargement des documents…
      </div>
    );
  }

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
          {statusOptions.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>

      {/* Légende couleurs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statusOptions.map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
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
                <th className="px-5 py-3 text-right">Actions</th>
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
                    className={cn(
                      "border-t border-border/40 hover:bg-muted/50",
                      d.status === "cancelled" && "opacity-60",
                      d.status === "paid" && "bg-green-50/40",
                      d.status === "overdue" && "bg-red-50/30",
                    )}
                  >
                    <td className="px-5 py-3 font-medium font-numeric">{d.number}</td>
                    <td className="px-5 py-3">{c?.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{shortDate(d.issueDate)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{shortDate(d.dueDate)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                        <StatusBadge status={d.status} />
                        <select
                          value={d.status}
                          onChange={(e) => setStatusWithToast(d.id, e.target.value as DocumentStatus, d.number)}
                          className="rounded-lg border border-border/60 bg-surface px-2 py-1 text-[11px] focus:border-primary focus:outline-none"
                          aria-label="Changer le statut"
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>{statusLabel(s)}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-numeric font-semibold">{currency(d.total)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Raccourcis statut */}
                        {type === "invoice" && d.status !== "sent" && d.status !== "paid" && d.status !== "cancelled" && (
                          <ActionBtn title="Marquer envoyée" onClick={() => setStatusWithToast(d.id, "sent", d.number)} className="text-sky-600 hover:bg-sky-50">
                            <Send className="h-4 w-4" />
                          </ActionBtn>
                        )}
                        {type === "invoice" && d.status !== "paid" && d.status !== "cancelled" && (
                          <ActionBtn title="Marquer payée" onClick={() => setStatusWithToast(d.id, "paid", d.number)} className="text-green-600 hover:bg-green-50">
                            <Banknote className="h-4 w-4" />
                          </ActionBtn>
                        )}
                        {type === "quotation" && d.status !== "accepted" && d.status !== "cancelled" && (
                          <ActionBtn title="Marquer accepté" onClick={() => setStatusWithToast(d.id, "accepted", d.number)} className="text-emerald-600 hover:bg-emerald-50">
                            <CheckCircle2 className="h-4 w-4" />
                          </ActionBtn>
                        )}
                        {type === "quotation" && d.status !== "rejected" && d.status !== "cancelled" && (
                          <ActionBtn title="Marquer refusé" onClick={() => setStatusWithToast(d.id, "rejected", d.number)} className="text-orange-600 hover:bg-orange-50">
                            <XCircle className="h-4 w-4" />
                          </ActionBtn>
                        )}
                        {d.status !== "cancelled" && (
                          <ActionBtn title="Annuler" onClick={() => setStatusWithToast(d.id, "cancelled", d.number)} className="text-rose-600 hover:bg-rose-50">
                            <Ban className="h-4 w-4" />
                          </ActionBtn>
                        )}
                        <Link
                          to={L.detail}
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

function ActionBtn({
  title,
  onClick,
  className,
  children,
}: {
  title: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl transition", className)}
    >
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
