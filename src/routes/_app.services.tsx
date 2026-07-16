import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Package, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { currency } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/services")({
  head: () => ({ meta: [{ title: "Catalogue des services — FacturIA" }] }),
  component: ServicesPage,
});

function ServicesPage() {
  const services = useAppStore((s) => s.services);
  const remove = useAppStore((s) => s.removeService);
  const add = useAppStore((s) => s.addService);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = services.filter((s) => `${s.code} ${s.name} ${s.category}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Catalogue de services" subtitle={`${services.length} prestations disponibles`} actions={
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"><Plus className="h-4 w-4" /> Nouveau service</button>
      } />

      <div className="glass-panel mb-4 flex items-center gap-3 rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans le catalogue…" className="w-full rounded-xl border border-border/60 bg-transparent pl-10 pr-3 py-2 text-sm focus:border-primary focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ y: -3 }} className="glass-panel rounded-3xl p-5 hover:shadow-glow transition-shadow">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-accent text-accent-foreground"><Package className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-numeric text-muted-foreground">{s.code}</div>
                <div className="font-semibold leading-tight">{s.name}</div>
              </div>
              <button onClick={() => { remove(s.id); toast.success("Service supprimé"); }} className="rounded-xl p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
            <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">{s.category}</span>
              <div className="text-right">
                <div className="font-numeric font-bold text-gradient-primary">{currency(s.unitPrice)}</div>
                <div className="text-[10px] text-muted-foreground">par {s.unit} · TVA {s.vatRate}%</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {open && <NewServiceDialog onClose={() => setOpen(false)} onCreate={(s) => { add(s); toast.success("Service ajouté"); setOpen(false); }} />}
    </div>
  );
}

function NewServiceDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (s: { code: string; name: string; description: string; unit: string; unitPrice: number; vatRate: number; category: string }) => void }) {
  const [form, setForm] = useState({ code: "", name: "", description: "", unit: "mois", unitPrice: 0, vatRate: 18, category: "Conseil" });
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-float">
        <h3 className="font-display text-lg font-semibold">Nouveau service</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Inp label="Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
          <Inp label="Catégorie" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
          <Inp label="Nom" value={form.name} onChange={(v) => setForm({ ...form, name: v })} className="col-span-2" />
          <Inp label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} className="col-span-2" />
          <Inp label="Unité" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} />
          <Inp label="Prix unitaire" type="number" value={String(form.unitPrice)} onChange={(v) => setForm({ ...form, unitPrice: Number(v) })} />
          <Inp label="TVA %" type="number" value={String(form.vatRate)} onChange={(v) => setForm({ ...form, vatRate: Number(v) })} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm">Annuler</button>
          <button onClick={() => onCreate(form)} className="rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">Créer</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Inp({ label, value, onChange, type = "text", className }: { label: string; value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none" />
    </label>
  );
}
