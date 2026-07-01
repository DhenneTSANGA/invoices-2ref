import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Building2, Mail, Phone, Plus, Search, Trash2, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { useAppStore } from "@/store/useAppStore";
import { shortDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clients/")({
  head: () => ({ meta: [{ title: "Clients — FacturIA" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const clients = useAppStore((s) => s.clients);
  const removeClient = useAppStore((s) => s.removeClient);
  const documents = useAppStore((s) => s.documents);
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>("all");

  const cities = useMemo(() => Array.from(new Set(clients.map((c) => c.city))).sort(), [clients]);

  const filtered = clients.filter((c) =>
    (city === "all" || c.city === city) &&
    (q === "" || `${c.name} ${c.ice} ${c.email} ${c.contactName}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} clients dans votre portefeuille`}
        actions={
          <Link to="/clients/new" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4" /> Nouveau client
          </Link>
        }
      />

      <div className="glass-panel mb-4 flex flex-wrap items-center gap-3 rounded-2xl p-3">
        <div className="relative flex-1 min-w-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par nom, ICE, email…" className="w-full rounded-xl border border-border/60 bg-transparent pl-10 pr-3 py-2 text-sm focus:border-primary focus:outline-none" />
        </div>
        <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl border border-border/60 bg-surface px-3 py-2 text-sm">
          <option value="all">Toutes les villes</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="Aucun client trouvé" description="Ajustez vos filtres ou créez un nouveau client." action={<Link to="/clients/new" className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">+ Nouveau client</Link>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c, i) => {
            const docsCount = documents.filter((d) => d.clientId === c.id).length;
            const totalRevenue = documents.filter((d) => d.clientId === c.id && d.type === "invoice" && d.status === "paid").reduce((a, b) => a + b.total, 0);
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ y: -3, scale: 1.01 }} className="glass-panel relative overflow-hidden rounded-3xl p-5 shadow-soft hover:shadow-glow transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground font-display font-bold shadow-glow">{c.name.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <Link to="/clients/$id" params={{ id: c.id }} className="font-display font-semibold leading-tight hover:text-primary">{c.name}</Link>
                    <div className="text-xs text-muted-foreground">{c.legalForm} · {c.city}</div>
                  </div>
                  <div className="flex gap-1">
                    <Link to="/clients/$id" params={{ id: c.id }} className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="h-4 w-4" /></Link>
                    <button onClick={() => { removeClient(c.id); toast.success("Client supprimé"); }} className="rounded-xl p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {c.email}</div>
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {c.phone}</div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-xs">
                  <div><div className="text-muted-foreground">ICE</div><div className="font-numeric font-medium">{c.ice.slice(0, 8)}…</div></div>
                  <div><div className="text-muted-foreground">Documents</div><div className="font-semibold">{docsCount}</div></div>
                  <div><div className="text-muted-foreground">CA payé</div><div className="font-numeric font-semibold text-success">{Math.round(totalRevenue / 1000)}k</div></div>
                </div>
                <div className="mt-3 text-[10px] text-muted-foreground">Ajouté le {shortDate(c.createdAt)}</div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
