import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Save,
  Send,
  Download,
  Eye,
  Loader2,
  FileText,
  UserRound,
  PenLine,
  Stamp,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import type { Document } from "@/store/types";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { downloadDocumentPdf } from "@/lib/pdf/downloadDocumentPdf";
import { Button } from "@/components/ui/button";
import { useClients, useUpsertDocument, useSendDocumentEmail } from "@/hooks/use-data";
import { cn } from "@/lib/utils";

type Props = { initial?: Document };

export function LetterEditor({ initial }: Props) {
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const upsertMutation = useUpsertDocument();
  const sendEmailMutation = useSendDocumentEmail();

  const [doc, setDoc] = useState<Document>(
    initial ?? {
      id: `d-${Date.now()}`,
      cabinet: "expertise_fiscale",
      type: "letter",
      number: `LT-2025-${String(10 + Math.floor(Math.random() * 89)).padStart(3, "0")}`,
      clientId: "",
      status: "draft",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      items: [],
      subtotal: 0,
      tps: 0,
      css: 0,
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
  const selectedClient = clients.find((c) => c.id === effectiveClientId);

  const save = async (status: Document["status"] = "draft") => {
    if (!effectiveClientId) {
      toast.error("Sélectionnez un client");
      return;
    }
    const draft = { ...doc, clientId: effectiveClientId, status };
    try {
      const saved = await upsertMutation.mutateAsync({
        ...(initial?.id && !initial.id.startsWith("d-") ? { id: draft.id } : {}),
        type: "letter",
        number: draft.number,
        clientId: draft.clientId,
        status: status === "sent" ? "draft" : draft.status,
        issueDate: draft.issueDate,
        dueDate: draft.dueDate,
        currency: draft.currency,
        subject: draft.subject ?? null,
        salutation: draft.salutation ?? null,
        body: draft.body ?? null,
        closing: draft.closing ?? null,
        signatoryTitle: draft.signatoryTitle ?? null,
        recipientOverride: draft.recipientOverride ?? null,
        items: [],
        subtotal: 0,
        tps: 0,
        css: 0,
        vat: 0,
        total: 0,
      });
      if (status === "sent") {
        const emailed = await sendEmailMutation.mutateAsync(saved.id);
        toast.success("Lettre envoyée par email", {
          description: `${saved.number} → ${emailed.to}`,
        });
      } else {
        toast.success("Lettre enregistrée", { description: saved.number });
      }
      void navigate({ to: "/lettre" });
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
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]">
        {/* Formulaire */}
        <div className="space-y-4">
          <Section
            icon={<FileText className="h-4 w-4" />}
            title="Identification"
            hint="Référence et date d'émission du courrier"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Référence"
                value={doc.number}
                onChange={(v) => setDoc({ ...doc, number: v })}
              />
              <Field
                label="Date"
                type="date"
                value={doc.issueDate}
                onChange={(v) => setDoc({ ...doc, issueDate: v })}
              />
            </div>
          </Section>

          <Section
            icon={<UserRound className="h-4 w-4" />}
            title="Destinataire"
            hint="Client rattaché ou adresse libre"
          >
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Client
                </span>
                <select
                  className="mt-1.5 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={effectiveClientId}
                  onChange={(e) => setDoc({ ...doc, clientId: e.target.value })}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedClient && !doc.recipientOverride && (
                <div className="flex gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div className="min-w-0 leading-relaxed">
                    <div className="font-medium">{selectedClient.contactName}</div>
                    <div className="text-amber-900/80">{selectedClient.name}</div>
                    <div className="text-amber-900/70">
                      {selectedClient.address} — {selectedClient.city}, {selectedClient.country}
                    </div>
                  </div>
                </div>
              )}

              <TextArea
                label="Adresse destinataire (optionnel)"
                hint="Remplace l'adresse du client sur le courrier"
                rows={3}
                placeholder={"Nom\nEntreprise\nAdresse\nVille, Pays"}
                value={doc.recipientOverride ?? ""}
                onChange={(v) => setDoc({ ...doc, recipientOverride: v || undefined })}
              />
            </div>
          </Section>

          <Section
            icon={<PenLine className="h-4 w-4" />}
            title="Contenu de la lettre"
            hint="Objet, formule d'appel et corps du message"
          >
            <div className="space-y-4">
              <Field
                label="Objet"
                value={doc.subject ?? ""}
                onChange={(v) => setDoc({ ...doc, subject: v })}
              />
              <Field
                label="Formule d'appel"
                value={doc.salutation ?? ""}
                onChange={(v) => setDoc({ ...doc, salutation: v })}
              />
              <TextArea
                label="Corps de la lettre"
                rows={11}
                value={doc.body ?? ""}
                onChange={(v) => setDoc({ ...doc, body: v })}
                className="leading-relaxed"
              />
              <TextArea
                label="Formule de politesse"
                rows={2}
                value={doc.closing ?? ""}
                onChange={(v) => setDoc({ ...doc, closing: v })}
              />
            </div>
          </Section>

          <Section
            icon={<Stamp className="h-4 w-4" />}
            title="Signature"
            hint="Qualité affichée sous le nom du signataire"
          >
            <Field
              label="Fonction du signataire"
              value={doc.signatoryTitle ?? ""}
              onChange={(v) => setDoc({ ...doc, signatoryTitle: v })}
            />
          </Section>

          <div className="flex flex-wrap items-center justify-end gap-2 rounded-3xl border border-border/50 bg-surface/80 p-3 backdrop-blur">
            <Button variant="outline" className="rounded-xl" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" /> Aperçu
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={exporting}
              onClick={downloadPdf}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              PDF
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={upsertMutation.isPending}
              onClick={() => save("draft")}
            >
              <Save className="h-4 w-4" /> Enregistrer
            </Button>
            <Button
              className="rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"
              disabled={upsertMutation.isPending}
              onClick={() => save("sent")}
            >
              <Send className="h-4 w-4" /> Envoyer
            </Button>
          </div>
        </div>

        {/* Aperçu live */}
        <aside className="hidden xl:block">
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <div className="text-sm font-semibold">Aperçu en direct</div>
                <div className="text-xs text-muted-foreground">Mise à jour à chaque saisie</div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Agrandir
              </button>
            </div>
            <div
              className="overflow-hidden rounded-3xl border border-border/60 bg-muted/40 p-3 shadow-inner"
              onClick={() => setPreviewOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setPreviewOpen(true);
              }}
            >
              <div className="origin-top scale-[0.72] cursor-zoom-in" style={{ width: "138.9%" }}>
                <DocumentPreview doc={previewDoc} compact />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <DocumentPreviewModal doc={previewDoc} open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
}

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="glass-panel overflow-hidden rounded-3xl">
      <div className="flex items-start gap-3 border-b border-border/50 bg-muted/30 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/20">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
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
        className="mt-1.5 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
  placeholder,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {hint && <span className="mt-0.5 block text-[11px] text-muted-foreground/80">{hint}</span>}
      <textarea
        className={cn(
          "mt-1.5 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
          className,
        )}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
