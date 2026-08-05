import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, Save, Send, Download, Eye, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  computeTotals,
  computeDocumentTotals,
  documentTaxRates,
  DEFAULT_VAT_RATE,
  DEFAULT_CSS_RATE,
  parseExecutionDays,
  formatExecutionTerms,
  breakdownFromTtc,
} from "@/lib/document-math";
import type { Document, DocumentType, LineItem } from "@/store/types";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { downloadDocumentPdf } from "@/lib/pdf/downloadDocumentPdf";
import { number } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/common/LoadingState";
import { useClients, useServices, useUpsertDocument, useSendDocumentEmail, useSession, usePeekNextDocumentNumber } from "@/hooks/use-data";
import type { Cabinet } from "@/lib/cabinets";

type Props = { initial?: Document; type: DocumentType };

const newId = () => `tmp-${Math.random().toString(36).slice(2, 9)}`;

function isPersistedId(id: string) {
  return !id.startsWith("d-") && !id.startsWith("tmp-");
}

function addDaysIso(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DocumentEditor({ initial, type }: Props) {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const activeCabinet: Cabinet =
    initial?.cabinet ?? session?.activeCabinet ?? "expertise_fiscale";
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const { data: services = [] } = useServices();
  const upsertMutation = useUpsertDocument();
  const sendEmailMutation = useSendDocumentEmail();

  const isNew = !initial;
  const commercial = type === "invoice" || type === "quotation";

  const [doc, setDoc] = useState<Document>(() =>
    initial ?? defaultDoc(type, "", activeCabinet),
  );

  const { data: peekedNumber } = usePeekNextDocumentNumber(
    commercial ? type : undefined,
    doc.issueDate,
    isNew && commercial,
  );

  // Aligner le cabinet du brouillon sur le cabinet actif (logo + infos société).
  useEffect(() => {
    if (initial) return;
    const cabinet = session?.activeCabinet;
    if (!cabinet) return;
    setDoc((d) => (d.cabinet === cabinet ? d : { ...d, cabinet }));
  }, [session?.activeCabinet, initial]);

  // Quand les clients arrivent (async), rattacher le 1er client si aucun n'est encore choisi
  useEffect(() => {
    if (initial?.clientId) return;
    const firstId = clients[0]?.id;
    if (!firstId) return;
    setDoc((d) => (d.clientId ? d : { ...d, clientId: firstId }));
  }, [clients, initial?.clientId]);

  // Numéro chronologique FA{n}-JJ-MM-AAAA / DV… (aperçu ; allocation définitive à l'enregistrement)
  useEffect(() => {
    if (!isNew || !commercial || !peekedNumber?.number) return;
    setDoc((d) =>
      d.number === peekedNumber.number ? d : { ...d, number: peekedNumber.number },
    );
  }, [isNew, commercial, peekedNumber?.number]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Choix avant saisie : lignes HT classiques, ou montant TTC global. */
  const [amountMode, setAmountMode] = useState<"ht" | "ttc">("ht");
  const [ttcInput, setTtcInput] = useState("");
  const [ttcVatRate, setTtcVatRate] = useState(DEFAULT_VAT_RATE);
  const [ttcCssRate, setTtcCssRate] = useState(DEFAULT_CSS_RATE);
  const [ttcDescription, setTtcDescription] = useState("Prestation");

  const effectiveClientId = doc.clientId || clients[0]?.id || "";
  const executionDays = parseExecutionDays(doc.executionTerms);
  const { vatRate, cssRate } = documentTaxRates(doc.items);

  const ttcAmount = Number(ttcInput.replace(/\s/g, "").replace(",", ".")) || 0;
  const ttcBreakdown = useMemo(
    () =>
      ttcAmount > 0
        ? breakdownFromTtc(ttcAmount, ttcVatRate, ttcCssRate)
        : null,
    [ttcAmount, ttcVatRate, ttcCssRate],
  );

  const applyTtcToDoc = (
    breakdown: NonNullable<typeof ttcBreakdown>,
    vat: number,
    css: number,
    description: string,
  ) => {
    setDoc((d) => ({
      ...d,
      items: [
        {
          id: d.items.length === 1 ? d.items[0]!.id : newId(),
          description: description.trim() || "Prestation",
          quantity: 1,
          unitPrice: breakdown.subtotal,
          vatRate: vat,
          cssRate: css,
          discount: 0,
          tpsRate: 0,
        },
      ],
    }));
  };

  const syncFromTtc = (
    rawTtc: string,
    vat: number,
    css: number,
    description: string,
  ) => {
    const amount = Number(rawTtc.replace(/\s/g, "").replace(",", ".")) || 0;
    if (amount <= 0) {
      setDoc((d) => ({ ...d, items: [] }));
      return;
    }
    applyTtcToDoc(breakdownFromTtc(amount, vat, css), vat, css, description);
  };

  const selectAmountMode = (mode: "ht" | "ttc") => {
    if (mode === amountMode) return;
    if (mode === "ttc") {
      const rates = documentTaxRates(doc.items);
      setTtcVatRate(rates.vatRate);
      setTtcCssRate(rates.cssRate);
      if (doc.items.length === 1 && doc.items[0]?.description) {
        setTtcDescription(doc.items[0].description);
      }
      const currentTotal = computeDocumentTotals(doc.items).total;
      const nextInput =
        currentTotal > 0 ? String(Math.round(currentTotal)) : ttcInput;
      if (currentTotal > 0) setTtcInput(nextInput);
      if (nextInput) {
        syncFromTtc(
          nextInput,
          rates.vatRate,
          rates.cssRate,
          doc.items.length === 1 && doc.items[0]?.description
            ? doc.items[0].description
            : ttcDescription,
        );
      }
    }
    setAmountMode(mode);
  };

  const totals = useMemo(
    () =>
      commercial
        ? computeDocumentTotals(doc.items)
        : computeTotals(doc.items),
    [doc.items, commercial],
  );
  const merged: Document = {
    ...doc,
    ...totals,
    clientId: effectiveClientId,
    items: commercial
      ? doc.items.map((it) => ({ ...it, tpsRate: 0 }))
      : doc.items,
  };

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
          vatRate: DEFAULT_VAT_RATE,
          discount: 0,
          tpsRate: 0,
          cssRate: DEFAULT_CSS_RATE,
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
          vatRate: s.vatRate || DEFAULT_VAT_RATE,
          discount: 0,
          tpsRate: 0,
          cssRate: DEFAULT_CSS_RATE,
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
        status: status === "sent" ? ("draft" as const) : status,
        issueDate: merged.issueDate,
        dueDate: merged.dueDate,
        currency: merged.currency,
        notes: merged.notes ?? null,
        paymentTerms: type === "quotation" ? null : (merged.paymentTerms ?? null),
        validityDays: merged.validityDays ?? null,
        executionTerms: merged.executionTerms ?? null,
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
          tpsRate: commercial ? 0 : (it.tpsRate ?? 0),
          cssRate: commercial ? (it.cssRate ?? DEFAULT_CSS_RATE) : (it.cssRate ?? 0),
        })),
        subtotal: merged.subtotal,
        tps: commercial ? 0 : merged.tps,
        css: commercial ? merged.css : merged.css,
        vat: merged.vat,
        total: merged.total,
      };
      const saved = await upsertMutation.mutateAsync(payload);
      if (status === "sent") {
        if (saved.status !== "signed" && saved.status !== "sent") {
          toast.success("Document enregistré", {
            description:
              "Demandez la signature (ou PDF physique) avant l’envoi e-mail.",
          });
          if (type === "invoice") {
            void navigate({ to: "/invoices/$id", params: { id: saved.id } });
          } else if (type === "quotation") {
            void navigate({ to: "/quotations/$id", params: { id: saved.id } });
          } else {
            void navigate({ to: listPath });
          }
          return;
        }
        const emailed = await sendEmailMutation.mutateAsync(saved);
        toast.success("Document envoyé par email", {
          description: `${saved.number} → ${emailed.to}`,
        });
      } else {
        toast.success("Document enregistré", { description: saved.number });
      }
      if (commercial) {
        void navigate({
          to: type === "invoice" ? "/invoices/$id" : "/quotations/$id",
          params: { id: saved.id },
        });
      } else {
        void navigate({ to: listPath });
      }
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
      <LoadingState
        icon={Users}
        title="Préparation de l'éditeur"
        description="Chargement des clients et du catalogue…"
      />
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
            readOnly={commercial}
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
            onChange={(v) => {
              const issueDate = v;
              if (type === "quotation") {
                const days = doc.validityDays ?? 30;
                setDoc({
                  ...doc,
                  issueDate,
                  dueDate: addDaysIso(issueDate, days),
                });
              } else {
                setDoc({ ...doc, issueDate });
              }
            }}
          />
          {type === "invoice" ? (
            <>
              <Field
                label="Échéance"
                type="date"
                value={doc.dueDate}
                onChange={(v) => setDoc({ ...doc, dueDate: v })}
              />
              <Field
                label="Conditions"
                value={doc.paymentTerms ?? ""}
                onChange={(v) => setDoc({ ...doc, paymentTerms: v })}
              />
            </>
          ) : (
            <>
              <Field
                label="Validité (jours)"
                type="number"
                value={String(doc.validityDays ?? 30)}
                onChange={(v) => {
                  const days = Math.max(1, Number(v) || 30);
                  setDoc({
                    ...doc,
                    validityDays: days,
                    dueDate: addDaysIso(doc.issueDate, days),
                  });
                }}
              />
              <Field
                label="Validité jusqu'au"
                type="date"
                value={doc.dueDate}
                onChange={(v) => setDoc({ ...doc, dueDate: v })}
              />
              <Field
                label="Délai de réalisation (jours)"
                type="number"
                value={String(executionDays)}
                onChange={(v) => {
                  const days = Math.max(1, Number(v) || 15);
                  setDoc({
                    ...doc,
                    executionTerms: formatExecutionTerms(days),
                  });
                }}
              />
              <Field
                label="Conditions de réalisation"
                value={doc.executionTerms ?? ""}
                onChange={(v) => setDoc({ ...doc, executionTerms: v })}
              />
            </>
          )}
          <Field
            label="Devise"
            value={doc.currency}
            onChange={(v) => setDoc({ ...doc, currency: v })}
          />
        </div>
      </div>

      {commercial ? (
        <div className="glass-panel rounded-3xl p-5">
          <h3 className="font-display font-semibold">Mode de saisie des montants</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choisissez d’abord comment vous allez renseigner les montants.
          </p>
          <div className="mt-4 inline-flex rounded-2xl border border-border bg-surface p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => selectAmountMode("ht")}
              className={
                amountMode === "ht"
                  ? "rounded-xl bg-gradient-primary px-4 py-2.5 text-primary-foreground shadow-glow"
                  : "rounded-xl px-4 py-2.5 text-muted-foreground hover:text-foreground"
              }
            >
              Saisie HT
            </button>
            <button
              type="button"
              onClick={() => selectAmountMode("ttc")}
              className={
                amountMode === "ttc"
                  ? "rounded-xl bg-gradient-primary px-4 py-2.5 text-primary-foreground shadow-glow"
                  : "rounded-xl px-4 py-2.5 text-muted-foreground hover:text-foreground"
              }
            >
              Saisie TTC
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {amountMode === "ht"
              ? "Mode classique : vous saisissez les lignes en HT, puis CSS et TVA sont calculées."
              : "Mode client TTC : vous saisissez le montant TTC, HT / CSS / TVA sont déduits automatiquement."}
          </p>
        </div>
      ) : null}

      {commercial && amountMode === "ttc" ? (
        <div className="glass-panel rounded-3xl p-5">
          <h3 className="font-display font-semibold">Montant TTC</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Indiquez le total TTC communiqué par le client. Les montants HT, CSS
            et TVA sont calculés et appliqués tout de suite.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </span>
              <input
                type="text"
                value={ttcDescription}
                onChange={(e) => {
                  const v = e.target.value;
                  setTtcDescription(v);
                  if (ttcBreakdown) {
                    syncFromTtc(ttcInput, ttcVatRate, ttcCssRate, v);
                  }
                }}
                className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Montant TTC
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={ttcInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setTtcInput(v);
                  syncFromTtc(v, ttcVatRate, ttcCssRate, ttcDescription);
                }}
                placeholder="Ex. 1190000"
                className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm font-numeric focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                TVA %
              </span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={ttcVatRate}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setTtcVatRate(v);
                  syncFromTtc(ttcInput, v, ttcCssRate, ttcDescription);
                }}
                className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm font-numeric focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                CSS %
              </span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={ttcCssRate}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setTtcCssRate(v);
                  syncFromTtc(ttcInput, ttcVatRate, v, ttcDescription);
                }}
                className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm font-numeric focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          {ttcBreakdown ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  HT
                </div>
                <div className="mt-0.5 font-numeric text-sm font-semibold">
                  {number(ttcBreakdown.subtotal)}
                </div>
              </div>
              <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  CSS ({ttcCssRate} %)
                </div>
                <div className="mt-0.5 font-numeric text-sm font-semibold">
                  {number(ttcBreakdown.css)}
                </div>
              </div>
              <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  TVA ({ttcVatRate} %)
                </div>
                <div className="mt-0.5 font-numeric text-sm font-semibold">
                  {number(ttcBreakdown.vat)}
                </div>
              </div>
              <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  TTC
                </div>
                <div className="mt-0.5 font-numeric text-sm font-bold text-gradient-primary">
                  {number(ttcBreakdown.total)}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm italic text-muted-foreground">
              Saisissez un montant TTC pour voir la décomposition.
            </p>
          )}
        </div>
      ) : null}

      {(!commercial || amountMode === "ht") ? (
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
                <th className="py-2 text-right font-medium w-28">P.U. HT</th>
                <th className="py-2 text-right font-medium w-20">TVA %</th>
                <th className="py-2 text-right font-medium w-20">CSS %</th>
                <th className="py-2 text-right font-medium w-20">Rem. %</th>
                <th className="py-2 text-right font-medium w-28">Total HT</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              <AnimateEmpty items={doc.items} colSpan={8} />
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
                    <td className="py-2 px-1">
                      <NumInput
                        value={it.cssRate ?? DEFAULT_CSS_RATE}
                        onChange={(v) => updateItem(it.id, { cssRate: v })}
                      />
                    </td>
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
          <Total label={`CSS (${cssRate} %)`} value={totals.css} />
          <Total label={`TVA (${vatRate} %)`} value={totals.vat} />
          <div className="my-2 h-px bg-border" />
          <Total label="Total TTC" value={totals.total} strong />
        </div>
      </div>
      ) : (
        <div className="glass-panel rounded-3xl p-5">
          <div className="ml-auto w-full max-w-xs space-y-2 rounded-2xl bg-surface-2 p-4">
            <Total label="Sous-total HT" value={totals.subtotal} />
            <Total label={`CSS (${cssRate} %)`} value={totals.css} />
            <Total label={`TVA (${vatRate} %)`} value={totals.vat} />
            <div className="my-2 h-px bg-border" />
            <Total label="Total TTC" value={totals.total} strong />
          </div>
        </div>
      )}

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
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        readOnly={readOnly}
        className={`mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition ${
          readOnly ? "cursor-default text-muted-foreground" : ""
        }`}
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

function defaultDoc(
  type: DocumentType,
  clientId: string,
  cabinet: Cabinet = "expertise_fiscale",
): Document {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const base = {
    id: `d-${Date.now()}`,
    cabinet,
    type,
    clientId,
    createdById: "staff-mireille",
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
      number: "…",
      notes: "Proposition valable sous réserve d'acceptation écrite.",
      validityDays: 30,
      executionTerms: formatExecutionTerms(15),
    };
  }
  return {
    ...base,
    number: "…",
    notes: "Règlement par virement bancaire.",
    paymentTerms: "30 jours fin de mois",
  };
}
