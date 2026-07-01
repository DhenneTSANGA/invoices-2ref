import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, Save, Send, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { useAppStore, computeTotals } from "@/store/useAppStore";
import type { Document, DocumentType, LineItem } from "@/store/types";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { number } from "@/lib/format";
import { Button } from "@/components/ui/button";

type Props = { initial?: Document; type: DocumentType };

const newId = () => `tmp-${Math.random().toString(36).slice(2, 9)}`;

export function DocumentEditor({ initial, type }: Props) {
  const navigate = useNavigate();
  const clients = useAppStore((s) => s.clients);
  const services = useAppStore((s) => s.services);
  const upsert = useAppStore((s) => s.upsertDocument);

  const [doc, setDoc] = useState<Document>(initial ?? {
    id: `d-${Date.now()}`,
    type,
    number: type === "invoice" ? `FA-2025-${String(150 + Math.floor(Math.random() * 99)).padStart(4, "0")}` : type === "quotation" ? `DV-2025-${String(95 + Math.floor(Math.random() * 99)).padStart(4, "0")}` : `PF-2025-${String(18 + Math.floor(Math.random() * 99)).padStart(4, "0")}`,
    clientId: clients[0]?.id ?? "",
    status: "draft",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    items: [],
    subtotal: 0, vat: 0, total: 0, currency: "MAD",
    notes: "Règlement par virement bancaire — merci de mentionner la référence du document.",
    paymentTerms: "30 jours fin de mois",
  });

  const [mobilePreview, setMobilePreview] = useState(false);

  const totals = useMemo(() => computeTotals(doc.items), [doc.items]);
  const merged: Document = { ...doc, ...totals };

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setDoc((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const addEmpty = () => setDoc((d) => ({
    ...d, items: [...d.items, { id: newId(), description: "", quantity: 1, unitPrice: 0, vatRate: 20, discount: 0 }],
  }));

  const addFromService = (sid: string) => {
    const s = services.find((x) => x.id === sid);
    if (!s) return;
    setDoc((d) => ({ ...d, items: [...d.items, { id: newId(), serviceId: s.id, description: s.name, quantity: 1, unitPrice: s.unitPrice, vatRate: s.vatRate, discount: 0 }] }));
  };

  const removeItem = (id: string) => setDoc((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));

  const save = (status: Document["status"] = "draft") => {
    const saved: Document = { ...merged, status };
    upsert(saved);
    toast.success(status === "sent" ? "Document envoyé" : "Document enregistré", { description: saved.number });
    navigate({ to: type === "invoice" ? "/invoices" : type === "quotation" ? "/quotations" : "/archive" });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_minmax(0,720px)]">
      {/* Left: form */}
      <div className="space-y-5">
        <div className="glass-panel rounded-3xl p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Numéro" value={doc.number} onChange={(v) => setDoc({ ...doc, number: v })} />
            <Select label="Client" value={doc.clientId} onChange={(v) => setDoc({ ...doc, clientId: v })} options={clients.map((c) => ({ value: c.id, label: c.name }))} />
            <Field label="Date d'émission" type="date" value={doc.issueDate} onChange={(v) => setDoc({ ...doc, issueDate: v })} />
            <Field label="Échéance" type="date" value={doc.dueDate} onChange={(v) => setDoc({ ...doc, dueDate: v })} />
            <Field label="Conditions de paiement" value={doc.paymentTerms ?? ""} onChange={(v) => setDoc({ ...doc, paymentTerms: v })} />
            <Field label="Devise" value={doc.currency} onChange={(v) => setDoc({ ...doc, currency: v })} />
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display font-semibold">Lignes de prestation</h3>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                onChange={(e) => { if (e.target.value) { addFromService(e.target.value); e.target.value = ""; } }}
                defaultValue=""
              >
                <option value="" disabled>+ Depuis le catalogue…</option>
                {services.map((s) => (<option key={s.id} value={s.id}>{s.code} — {s.name}</option>))}
              </select>
              <Button onClick={addEmpty} variant="outline" size="sm" className="rounded-xl"><Plus className="h-4 w-4" /> Ligne libre</Button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="py-2 text-left font-medium">Description</th>
                  <th className="py-2 text-right font-medium w-20">Qté</th>
                  <th className="py-2 text-right font-medium w-28">P.U.</th>
                  <th className="py-2 text-right font-medium w-20">TVA %</th>
                  <th className="py-2 text-right font-medium w-20">Rem. %</th>
                  <th className="py-2 text-right font-medium w-28">Total HT</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {doc.items.map((it, i) => {
                    const lineTotal = it.quantity * it.unitPrice * (1 - (it.discount || 0) / 100);
                    return (
                      <motion.tr
                        key={it.id}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.25, delay: i * 0.02 }}
                        className="border-b border-border/40"
                      >
                        <td className="py-2 pr-2">
                          <input className="w-full rounded-lg border border-border/60 bg-transparent px-2 py-1.5 focus:border-primary focus:outline-none" value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} />
                        </td>
                        <td className="py-2 px-1"><NumInput value={it.quantity} onChange={(v) => updateItem(it.id, { quantity: v })} /></td>
                        <td className="py-2 px-1"><NumInput value={it.unitPrice} onChange={(v) => updateItem(it.id, { unitPrice: v })} step={0.01} /></td>
                        <td className="py-2 px-1"><NumInput value={it.vatRate} onChange={(v) => updateItem(it.id, { vatRate: v })} /></td>
                        <td className="py-2 px-1"><NumInput value={it.discount} onChange={(v) => updateItem(it.id, { discount: v })} /></td>
                        <td className="py-2 text-right font-numeric font-semibold">{number(lineTotal)}</td>
                        <td className="py-2 pl-1"><button onClick={() => removeItem(it.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button></td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
                {doc.items.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-sm text-muted-foreground italic">Ajoutez votre première ligne pour démarrer.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 ml-auto w-full max-w-xs space-y-2 rounded-2xl bg-surface-2 p-4">
            <Total label="Sous-total HT" value={totals.subtotal} />
            <Total label="TVA" value={totals.vat} />
            <div className="my-2 h-px bg-border" />
            <Total label="Total TTC" value={totals.total} strong />
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes & mentions</label>
          <textarea className="mt-2 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none" rows={3} value={doc.notes ?? ""} onChange={(e) => setDoc({ ...doc, notes: e.target.value })} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setMobilePreview(true)}><Eye className="h-4 w-4" /> Aperçu</Button>
          <Button variant="outline" className="rounded-xl" onClick={() => toast.info("Export PDF prêt", { description: "Téléchargement simulé." })}><Download className="h-4 w-4" /> PDF</Button>
          <Button variant="outline" className="rounded-xl" onClick={() => save("draft")}><Save className="h-4 w-4" /> Enregistrer</Button>
          <Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95" onClick={() => save("sent")}><Send className="h-4 w-4" /> Envoyer</Button>
        </div>
      </div>

      {/* Right: live preview (desktop) */}
      <div className="hidden xl:block">
        <div className="sticky top-20">
          <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Aperçu temps réel</div>
          <motion.div key={JSON.stringify({ id: merged.clientId, n: merged.items.length, t: merged.total })} initial={{ opacity: 0.7, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <DocumentPreview doc={merged} />
          </motion.div>
        </div>
      </div>

      {/* Mobile preview overlay */}
      <AnimatePresence>
        {mobilePreview && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur xl:hidden"
            onClick={() => setMobilePreview(false)}
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="max-h-[92vh] w-[92vw] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <DocumentPreview doc={merged} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type={type} className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <select className="mt-1 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function NumInput({ value, onChange, step = 1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <input
      type="number" step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-border/60 bg-transparent px-2 py-1.5 text-right font-numeric focus:border-primary focus:outline-none"
    />
  );
}

function Total({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "text-sm font-bold uppercase tracking-wide" : "text-xs text-muted-foreground"}>{label}</span>
      <span className={`font-numeric ${strong ? "text-lg font-bold text-gradient-primary" : "text-sm font-semibold"}`}>{number(value)} MAD</span>
    </div>
  );
}
