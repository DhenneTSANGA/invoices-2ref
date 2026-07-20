import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Save, Send, Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Document } from "@/store/types";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { downloadDocumentPdf } from "@/lib/pdf/downloadDocumentPdf";
import { Button } from "@/components/ui/button";
import { useClients, useUpsertDocument } from "@/hooks/use-data";

type Props = { initial?: Document };

export function LetterEditor({ initial }: Props) {
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const upsertMutation = useUpsertDocument();

  const [doc, setDoc] = useState<Document>(
    initial ?? {
      id: `d-${Date.now()}`,
      type: "letter",
      number: `LT-2025-${String(10 + Math.floor(Math.random() * 89)).padStart(3, "0")}`,
      clientId: "",
      status: "draft",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      items: [],
      subtotal: 0,
      vat: 0,
      total: 0,
      currency: "XAF",
      subject: "Relance de paiement — facture en souffrance",
      salutation: "Madame, Monsieur,",
      body:
        "Nous nous permettons de vous rappeler que la facture mentionnée en référence demeure impayée à ce jour.\n\nSauf erreur de notre part, aucun règlement n'a été porté à notre connaissance. Nous vous serions reconnaissants de bien vouloir procéder au paiement dans les meilleurs délais, ou de nous informer de toute difficulté éventuelle.\n\nNous restons à votre entière disposition pour tout échange utile.",
      closing:
        "Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",
      signatoryTitle: "Expert-comptable",
    },
  );

  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (initial?.clientId) return;
    const firstId = clients[0]?.id;
    if (!firstId) return;
    setDoc((d) => (d.clientId ? d : { ...d, clientId: firstId }));
  }, [clients, initial?.clientId]);

  const effectiveClientId = doc.clientId || clients[0]?.id || "";
  const previewDoc = { ...doc, clientId: effectiveClientId };

  const save = async (status: Document["status"] = "draft") => {
    if (!effectiveClientId) {
      toast.error("Sélectionnez un client");
      return;
    }
    const saved = { ...doc, clientId: effectiveClientId, status };
    try {
      await upsertMutation.mutateAsync({
        ...(initial?.id && !initial.id.startsWith("d-") ? { id: saved.id } : {}),
        type: "letter",
        number: saved.number,
        clientId: saved.clientId,
        status: saved.status,
        issueDate: saved.issueDate,
        dueDate: saved.dueDate,
        currency: saved.currency,
        subject: saved.subject ?? null,
        salutation: saved.salutation ?? null,
        body: saved.body ?? null,
        closing: saved.closing ?? null,
        signatoryTitle: saved.signatoryTitle ?? null,
        recipientOverride: saved.recipientOverride ?? null,
        items: [],
        subtotal: 0,
        vat: 0,
        total: 0,
      });
      toast.success(
        status === "sent" ? "Lettre enregistrée / envoyée" : "Lettre enregistrée",
        { description: saved.number },
      );
      void navigate({ to: "/letters" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    }
  };

  const downloadPdf = async () => {
    setExporting(true);
    const toastId = toast.loading("Génération du PDF…");
    try {
      await downloadDocumentPdf(previewDoc);
      toast.success("PDF téléchargé", { id: toastId, description: `${doc.number}.pdf` });
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
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="glass-panel rounded-3xl p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Référence" value={doc.number} onChange={(v) => setDoc({ ...doc, number: v })} />
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Destinataire (client)</span>
            <select
              className="mt-1 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm"
              value={effectiveClientId}
              onChange={(e) => setDoc({ ...doc, clientId: e.target.value })}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <Field label="Date" type="date" value={doc.issueDate} onChange={(v) => setDoc({ ...doc, issueDate: v })} />
          <Field label="Fonction du signataire" value={doc.signatoryTitle ?? ""} onChange={(v) => setDoc({ ...doc, signatoryTitle: v })} />
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-5 space-y-4">
        <Field label="Objet" value={doc.subject ?? ""} onChange={(v) => setDoc({ ...doc, subject: v })} />
        <Field label="Formule d'appel" value={doc.salutation ?? ""} onChange={(v) => setDoc({ ...doc, salutation: v })} />
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Corps de la lettre</span>
          <textarea
            className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm leading-relaxed focus:border-primary focus:outline-none"
            rows={10}
            value={doc.body ?? ""}
            onChange={(e) => setDoc({ ...doc, body: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Formule de politesse</span>
          <textarea
            className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            rows={2}
            value={doc.closing ?? ""}
            onChange={(e) => setDoc({ ...doc, closing: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Adresse destinataire (optionnel, remplace le client)</span>
          <textarea
            className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            rows={3}
            placeholder="Nom&#10;Entreprise&#10;Adresse&#10;Ville, Pays"
            value={doc.recipientOverride ?? ""}
            onChange={(e) => setDoc({ ...doc, recipientOverride: e.target.value })}
          />
        </label>
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
        <Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-glow" onClick={() => save("sent")}>
          <Send className="h-4 w-4" /> Envoyer
        </Button>
      </div>

      <DocumentPreviewModal doc={previewDoc} open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
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
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
