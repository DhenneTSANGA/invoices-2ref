import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, Save, Send, Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore, computeTotals } from "@/store/useAppStore";
import type { Document, DocumentType, LineItem } from "@/store/types";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { downloadDocumentPdf } from "@/lib/pdf/downloadDocumentPdf";
import { number } from "@/lib/format";
import { Button } from "@/components/ui/button";

type Props = { initial?: Document; type: DocumentType };

const newId = () => `tmp-${Math.random().toString(36).slice(2, 9)}`;

export function DocumentEditor({ initial, type }: Props) {
  const navigate = useNavigate();
  const clients = useAppStore((s) => s.clients);
  const services = useAppStore((s) => s.services);
  const upsert = useAppStore((s) => s.upsertDocument);

  const [doc, setDoc] = useState<Document>(initial ?? defaultDoc(type, clients[0]?.id ?? ""));

  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const totals = useMemo(() => computeTotals(doc.items), [doc.items]);
  const merged: Document = { ...doc, ...totals };

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setDoc((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const addEmpty = () => setDoc((d) => ({
    ...d, items: [...d.items, { id: newId(), description: "", quantity: 1, unitPrice: 0, vatRate: 18, discount: 0 }],
  }));

  const addFromService = (sid: string) => {
    const s = services.find((x) => x.id === sid);
    if (!s) return;
    setDoc((d) => ({ ...d, items: [...d.items, { id: newId(), serviceId: s.id, description: s.name, quantity: 1, unitPrice: s.unitPrice, vatRate: s.vatRate, discount: 0 }] }));
  };

  const removeItem = (id: string) => setDoc((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));

  const listPath =
    type === "invoice" ? "/invoices" :
    type === "quotation" ? "/quotations" :
    type === "proforma" ? "/proformas" :
    "/letters";

  const save = (status: Document["status"] = "draft") => {
    const saved: Document = { ...merged, status };
    upsert(saved);
    toast.success(status === "sent" ? "Document envoyé" : "Document enregistré", { description: saved.number });
    navigate({ to: listPath });
  };

  const downloadPdf = async () => {
    setExporting(true);
    const toastId = toast.loading("Génération du PDF…");
    try {
      await downloadDocumentPdf(merged);
      toast.success("PDF téléchargé", { id: toastId, description: `${merged.number}.pdf` });
    } catch (err) {
      console.error(err);
      toast.error("Impossible de générer le PDF", {
        id: toastId,
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="glass-panel rounded-3xl p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Numéro" value={doc.number} onChange={(v) => setDoc({ ...doc, number: v })} />
          <Select label="Client" value={doc.clientId} onChange={(v) => setDoc({ ...doc, clientId: v })} options={clients.map((c) => ({ value: c.id, label: c.name }))} />
          <Field label="Date d'émission" type="date" value={doc.issueDate} onChange={(v) => setDoc({ ...doc, issueDate: v })} />
          <Field label="Échéance" type="date" value={doc.dueDate} onChange={(v) => setDoc({ ...doc, dueDate: v })} />
          <Field label="Conditions de paiement" value={doc.paymentTerms ?? ""} onChange={(v) => setDoc({ ...doc, paymentTerms: v })} />
          <Field label="Devise" value={doc.currency} onChange={(v) => setDoc({ ...doc, currency: v })} />
          {type === "quotation" && (
            <>
              <Field label="Validité (jours)" type="number" value={String(doc.validityDays ?? 30)} onChange={(v) => setDoc({ ...doc, validityDays: Number(v) || 30 })} />
              <Field label="Conditions de réalisation" value={doc.executionTerms ?? ""} onChange={(v) => setDoc({ ...doc, executionTerms: v })} />
            </>
          )}
          {type === "proforma" && (
            <>
              <Field label="Incoterm" value={doc.incoterm ?? ""} onChange={(v) => setDoc({ ...doc, incoterm: v })} />
              <Field label="Transport / assurance" value={doc.shippingNotes ?? ""} onChange={(v) => setDoc({ ...doc, shippingNotes: v })} />
            </>
          )}
        </div>
        {type === "proforma" && (
          <div className="mt-4">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mention légale pro forma</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
                rows={2}
                value={doc.disclaimer ?? ""}
                onChange={(e) => setDoc({ ...doc, disclaimer: e.target.value })}
              />
            </label>
          </div>
        )}
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
                <th className="py-2 text-right font-medium w-28">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              <AnimateEmpty items={doc.items} />
              {doc.items.map((it) => {
                const lineTotal = it.quantity * it.unitPrice * (1 - (it.discount || 0) / 100);
                return (
                  <tr key={it.id} className="border-b border-border/40">
                    <td className="py-2 pr-2">
                      <input
                        className="w-full rounded-lg border border-border/60 bg-transparent px-2 py-1.5 focus:border-primary focus:outline-none"
                        value={it.description}
                        onChange={(e) => updateItem(it.id, { description: e.target.value })}
                      />
                    </td>
                    <td className="py-2 px-1"><NumInput value={it.quantity} onChange={(v) => updateItem(it.id, { quantity: v })} /></td>
                    <td className="py-2 px-1"><NumInput value={it.unitPrice} onChange={(v) => updateItem(it.id, { unitPrice: v })} step={1} /></td>
                    <td className="py-2 px-1"><NumInput value={it.vatRate} onChange={(v) => updateItem(it.id, { vatRate: v })} /></td>
                    <td className="py-2 px-1"><NumInput value={it.discount} onChange={(v) => updateItem(it.id, { discount: v })} /></td>
                    <td className="py-2 pl-2 text-right font-numeric font-semibold">{number(lineTotal)}</td>
                    <td className="py-2 pl-1">
                      <button type="button" onClick={() => removeItem(it.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
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
        <Button variant="outline" className="rounded-xl" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-4 w-4" /> Aperçu
        </Button>
        <Button variant="outline" className="rounded-xl" disabled={exporting} onClick={downloadPdf}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          PDF
        </Button>
        <Button variant="outline" className="rounded-xl" onClick={() => save("draft")}>
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
        <Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95" onClick={() => save("sent")}>
          <Send className="h-4 w-4" /> Envoyer
        </Button>
      </div>

      <DocumentPreviewModal doc={merged} open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
}

function AnimateEmpty({ items }: { items: LineItem[] }) {
  if (items.length > 0) return null;
  return (
    <tr>
      <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
        Aucune ligne — ajoutez une prestation depuis le catalogue ou une ligne libre.
      </td>
    </tr>
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
      <span className={`font-numeric ${strong ? "text-lg font-bold text-gradient-primary" : "text-sm font-semibold"}`}>{number(value)} XAF</span>
    </div>
  );
}

function defaultDoc(type: DocumentType, clientId: string): Document {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const base = {
    id: `d-${Date.now()}`,
    type,
    clientId,
    createdById: "staff-mireille",
    status: "draft" as const,
    issueDate: today,
    dueDate: due,
    items: [] as LineItem[],
    subtotal: 0,
    vat: 0,
    total: 0,
    currency: "XAF",
  };

  if (type === "quotation") {
    return {
      ...base,
      number: `DV-2025-${String(95 + Math.floor(Math.random() * 99)).padStart(4, "0")}`,
      notes: "Proposition valable sous réserve d'acceptation écrite.",
      paymentTerms: "Acompte 40 % à la commande — solde à livraison (XAF).",
      validityDays: 30,
      executionTerms: "Délai d'exécution : 15 jours ouvrés après acceptation du devis. Prestations réalisées à Libreville sauf accord contraire.",
    };
  }
  if (type === "proforma") {
    return {
      ...base,
      number: `PF-2025-${String(18 + Math.floor(Math.random() * 99)).padStart(4, "0")}`,
      notes: "Montants estimatifs en Francs CFA — à confirmer sur facture définitive.",
      paymentTerms: "Virement bancaire en XAF après émission de la facture définitive.",
      incoterm: "CIP Libreville",
      shippingNotes: "Transport et assurance à la charge du fournisseur jusqu'au lieu convenu (zone CEMAC).",
      disclaimer:
        "Document prévisionnel sans valeur comptable ni fiscale. Ne constitue pas une facture définitive et n'ouvre aucun droit à recouvrement.",
    };
  }
  return {
    ...base,
    number: `FA-2025-${String(150 + Math.floor(Math.random() * 99)).padStart(4, "0")}`,
    notes: "Règlement par virement bancaire — merci de mentionner la référence du document.",
    paymentTerms: "30 jours fin de mois",
  };
}
