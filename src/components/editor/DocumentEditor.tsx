import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, Save, Send, Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { computeTotals } from "@/lib/document-math";
import type { Document, DocumentType, LineItem } from "@/store/types";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { downloadDocumentPdf } from "@/lib/pdf/downloadDocumentPdf";
import { number } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useClients, useServices, useUpsertDocument } from "@/hooks/use-data";

type Props = { initial?: Document; type: DocumentType };

const newId = () => `tmp-${Math.random().toString(36).slice(2, 9)}`;

function isPersistedId(id: string) {
  return !id.startsWith("d-") && !id.startsWith("tmp-");
}

export function DocumentEditor({ initial, type }: Props) {
  const navigate = useNavigate();
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const { data: services = [] } = useServices();
  const upsertMutation = useUpsertDocument();

  const [doc, setDoc] = useState<Document>(() =>
    initial ?? defaultDoc(type, ""),
  );

  // Quand les clients arrivent (async), rattacher le 1er client si aucun n'est encore choisi
  useEffect(() => {
    if (initial?.clientId) return;
    const firstId = clients[0]?.id;
    if (!firstId) return;
    setDoc((d) => (d.clientId ? d : { ...d, clientId: firstId }));
  }, [clients, initial?.clientId]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => computeTotals(doc.items), [doc.items]);
  const showTaxColumns = type === "invoice" || type === "quotation";
  const effectiveClientId = doc.clientId || clients[0]?.id || "";
  const merged: Document = { ...doc, ...totals, clientId: effectiveClientId };

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setDoc((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));

  const addEmpty = () =>
    setDoc((d) => ({
      ...d,
      items: [
        ...d.items,
        {
          id: newId(),
          description: "",
          quantity: 1,
          unitPrice: 0,
          vatRate: 18,
          discount: 0,
          tpsRate: 0,
          cssRate: 0,
        },
      ],
    }));

  const addFromService = (sid: string) => {
    const s = services.find((x) => x.id === sid);
    if (!s) return;
    setDoc((d) => ({
      ...d,
      items: [
        ...d.items,
        {
          id: newId(),
          serviceId: s.id,
          description: s.name,
          quantity: 1,
          unitPrice: s.unitPrice,
          vatRate: s.vatRate,
          discount: 0,
          tpsRate: 0,
          cssRate: 0,
        },
      ],
    }));
  };

  const removeItem = (id: string) =>
    setDoc((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));

  const listPath =
    type === "invoice"
      ? "/invoices"
      : type === "quotation"
        ? "/quotations"
        : type === "proforma"
          ? "/proformas"
          : "/lettre";

  const save = async (status: Document["status"] = "draft") => {
    if (!merged.clientId) {
      toast.error("Sélectionnez un client");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...(initial && isPersistedId(initial.id) ? { id: merged.id } : {}),
        type,
        number: merged.number,
        clientId: merged.clientId,
        status,
        issueDate: merged.issueDate,
        dueDate: merged.dueDate,
        currency: merged.currency,
        notes: merged.notes ?? null,
        paymentTerms: merged.paymentTerms ?? null,
        validityDays: merged.validityDays ?? null,
        executionTerms: merged.executionTerms ?? null,
        incoterm: merged.incoterm ?? null,
        shippingNotes: merged.shippingNotes ?? null,
        disclaimer: merged.disclaimer ?? null,
        subject: merged.subject ?? null,
        salutation: merged.salutation ?? null,
        body: merged.body ?? null,
        closing: merged.closing ?? null,
        signatoryTitle: merged.signatoryTitle ?? null,
        recipientOverride: merged.recipientOverride ?? null,
        items: merged.items.map((it) => ({
          id: isPersistedId(it.id) ? it.id : undefined,
          serviceId: it.serviceId ?? null,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          vatRate: it.vatRate,
          discount: it.discount ?? 0,
          tpsRate: it.tpsRate ?? 0,
          cssRate: it.cssRate ?? 0,
        })),
        subtotal: merged.subtotal,
        tps: merged.tps,
        css: merged.css,
        vat: merged.vat,
        total: merged.total,
      };
      await upsertMutation.mutateAsync(payload);
      toast.success(
        status === "sent" ? "Document envoyé" : "Document enregistré",
        { description: merged.number },
      );
      void navigate({ to: listPath });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    setExporting(true);
    const toastId = toast.loading("Génération du PDF…");
    try {
      await downloadDocumentPdf(merged);
      toast.success("PDF téléchargé", {
        id: toastId,
        description: `${merged.number}.pdf`,
      });
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

  if (loadingClients) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Créez au moins un client avant d&apos;émettre un document.
        </p>
        <Button className="mt-4 rounded-xl" onClick={() => navigate({ to: "/clients/new" })}>
          Nouveau client
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="glass-panel rounded-3xl p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Numéro"
            value={doc.number}
            onChange={(v) => setDoc({ ...doc, number: v })}
          />
          <Select
            label="Client"
            value={effectiveClientId}
            onChange={(v) => setDoc({ ...doc, clientId: v })}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Field
            label="Date d'émission"
            type="date"
            value={doc.issueDate}
            onChange={(v) => setDoc({ ...doc, issueDate: v })}
          />
          <Field
            label="Échéance"
            type="date"
            value={doc.dueDate}
            onChange={(v) => setDoc({ ...doc, dueDate: v })}
          />
          <Field
            label="Conditions de paiement"
            value={doc.paymentTerms ?? ""}
            onChange={(v) => setDoc({ ...doc, paymentTerms: v })}
          />
          <Field
            label="Devise"
            value={doc.currency}
            onChange={(v) => setDoc({ ...doc, currency: v })}
          />
          {type === "quotation" && (
            <>
              <Field
                label="Validité (jours)"
                type="number"
                value={String(doc.validityDays ?? 30)}
                onChange={(v) =>
                  setDoc({ ...doc, validityDays: Number(v) || 30 })
                }
              />
              <Field
                label="Conditions de réalisation"
                value={doc.executionTerms ?? ""}
                onChange={(v) => setDoc({ ...doc, executionTerms: v })}
              />
            </>
          )}
          {type === "proforma" && (
            <>
              <Field
                label="Incoterm"
                value={doc.incoterm ?? ""}
                onChange={(v) => setDoc({ ...doc, incoterm: v })}
              />
              <Field
                label="Transport / assurance"
                value={doc.shippingNotes ?? ""}
                onChange={(v) => setDoc({ ...doc, shippingNotes: v })}
              />
            </>
          )}
        </div>
        {type === "proforma" && (
          <div className="mt-4">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Mention légale pro forma
              </span>
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
              onChange={(e) => {
                if (e.target.value) {
                  addFromService(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>
                + Depuis le catalogue…
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
            <Button onClick={addEmpty} variant="outline" size="sm" className="rounded-xl">
              <Plus className="h-4 w-4" /> Ligne libre
            </Button>
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
                {showTaxColumns && (
                  <>
                    <th className="py-2 text-right font-medium w-20">TPS %</th>
                    <th className="py-2 text-right font-medium w-20">CSS %</th>
                  </>
                )}
                <th className="py-2 text-right font-medium w-20">Rem. %</th>
                <th className="py-2 text-right font-medium w-28">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              <AnimateEmpty items={doc.items} colSpan={showTaxColumns ? 9 : 7} />
              {doc.items.map((it) => {
                const lineTotal =
                  it.quantity * it.unitPrice * (1 - (it.discount || 0) / 100);
                return (
                  <tr key={it.id} className="border-b border-border/40">
                    <td className="py-2 pr-2">
                      <input
                        className="w-full rounded-lg border border-border/60 bg-transparent px-2 py-1.5 focus:border-primary focus:outline-none"
                        value={it.description}
                        onChange={(e) =>
                          updateItem(it.id, { description: e.target.value })
                        }
                      />
                    </td>
                    <td className="py-2 px-1">
                      <NumInput
                        value={it.quantity}
                        onChange={(v) => updateItem(it.id, { quantity: v })}
                      />
                    </td>
                    <td className="py-2 px-1">
                      <NumInput
                        value={it.unitPrice}
                        onChange={(v) => updateItem(it.id, { unitPrice: v })}
                        step={1}
                      />
                    </td>
                    <td className="py-2 px-1">
                      <NumInput
                        value={it.vatRate}
                        onChange={(v) => updateItem(it.id, { vatRate: v })}
                      />
                    </td>
                    {showTaxColumns && (
                      <>
                        <td className="py-2 px-1">
                          <NumInput
                            value={it.tpsRate}
                            onChange={(v) => updateItem(it.id, { tpsRate: v })}
                          />
                        </td>
                        <td className="py-2 px-1">
                          <NumInput
                            value={it.cssRate}
                            onChange={(v) => updateItem(it.id, { cssRate: v })}
                          />
                        </td>
                      </>
                    )}
                    <td className="py-2 px-1">
                      <NumInput
                        value={it.discount}
                        onChange={(v) => updateItem(it.id, { discount: v })}
                      />
                    </td>
                    <td className="py-2 pl-2 text-right font-numeric font-semibold">
                      {number(lineTotal)}
                    </td>
                    <td className="py-2 pl-1">
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                      >
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
          {showTaxColumns && totals.tps > 0 && <Total label="TPS" value={totals.tps} />}
          {showTaxColumns && totals.css > 0 && <Total label="CSS" value={totals.css} />}
          <Total label="TVA" value={totals.vat} />
          <div className="my-2 h-px bg-border" />
          <Total label="Total TTC" value={totals.total} strong />
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-5">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Notes & mentions
        </label>
        <textarea
          className="mt-2 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
          rows={3}
          value={doc.notes ?? ""}
          onChange={(e) => setDoc({ ...doc, notes: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="h-4 w-4" /> Aperçu
        </Button>
        <Button
          variant="outline"
          className="rounded-xl"
          disabled={exporting}
          onClick={downloadPdf}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          PDF
        </Button>
        <Button
          variant="outline"
          className="rounded-xl"
          disabled={saving}
          onClick={() => save("draft")}
        >
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
        <Button
          className="rounded-xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95"
          disabled={saving}
          onClick={() => save("sent")}
        >
          <Send className="h-4 w-4" /> Envoyer
        </Button>
      </div>

      <DocumentPreviewModal
        doc={merged}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}

function AnimateEmpty({ items, colSpan = 7 }: { items: LineItem[]; colSpan?: number }) {
  if (items.length > 0) return null;
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
        Aucune ligne — ajoutez une prestation depuis le catalogue ou une ligne libre.
      </td>
    </tr>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        className="mt-1 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumInput({
  value,
  onChange,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-border/60 bg-transparent px-2 py-1.5 text-right font-numeric focus:border-primary focus:outline-none"
    />
  );
}

function Total({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          strong
            ? "text-sm font-bold uppercase tracking-wide"
            : "text-xs text-muted-foreground"
        }
      >
        {label}
      </span>
      <span
        className={`font-numeric ${strong ? "text-lg font-bold text-gradient-primary" : "text-sm font-semibold"}`}
      >
        {number(value)} XAF
      </span>
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
    status: "draft" as const,
    issueDate: today,
    dueDate: due,
    items: [] as LineItem[],
    subtotal: 0,
    tps: 0,
    css: 0,
    vat: 0,
    total: 0,
    currency: "XAF",
  };

  if (type === "quotation") {
    return {
      ...base,
      number: `DV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      notes: "Proposition valable sous réserve d'acceptation écrite.",
      paymentTerms: "Acompte 40 % à la commande — solde à livraison (XAF).",
      validityDays: 30,
      executionTerms:
        "Délai d'exécution : 15 jours ouvrés après acceptation du devis.",
    };
  }
  if (type === "proforma") {
    return {
      ...base,
      number: `PF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      notes: "Montants estimatifs en Francs CFA.",
      paymentTerms: "Virement bancaire en XAF après facture définitive.",
      incoterm: "CIP Libreville",
      shippingNotes: "Transport et assurance selon accord.",
      disclaimer:
        "Document prévisionnel sans valeur comptable ni fiscale.",
    };
  }
  return {
    ...base,
    number: `FA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    notes: "Règlement par virement bancaire.",
    paymentTerms: "30 jours fin de mois",
  };
}
