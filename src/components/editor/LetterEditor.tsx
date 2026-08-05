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
import { downloadDocumentPdf } from "@/lib/pdf/downloadDocumentPdf";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/common/LoadingState";
import {
  useClients,
  useUpsertDocument,
  useSendDocumentEmail,
  useSession,
  useRequestLetterSignature,
  useSignLetterDocument,
} from "@/hooks/use-data";
import type { Cabinet } from "@/lib/cabinets";
import { isAdmin } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { clientLetterPostalLine, clientRepresentativeLine, clientDisplayName } from "@/lib/client-address";

type Props = { initial?: Document };

export function LetterEditor({ initial }: Props) {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const activeCabinet: Cabinet =
    initial?.cabinet ?? session?.activeCabinet ?? "expertise_fiscale";
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const upsertMutation = useUpsertDocument();
  const sendEmailMutation = useSendDocumentEmail();
  const requestSignMutation = useRequestLetterSignature();
  const signMutation = useSignLetterDocument();
  const adminLike = session ? isAdmin(session.staff.role) : false;

  const [doc, setDoc] = useState<Document>(
    initial ?? {
      id: `d-${Date.now()}`,
      cabinet: activeCabinet,
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
      subject: "",
      salutation: "",
      body: "",
      closing: "",
      signatoryTitle: "Le Gérant",
    },
  );

  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (initial) return;
    const cabinet = session?.activeCabinet;
    if (!cabinet) return;
    setDoc((d) => (d.cabinet === cabinet ? d : { ...d, cabinet }));
  }, [session?.activeCabinet, initial]);

  useEffect(() => {
    if (initial?.clientId) return;
    const firstId = clients[0]?.id;
    if (!firstId) return;
    setDoc((d) => (d.clientId ? d : { ...d, clientId: firstId }));
  }, [clients, initial?.clientId]);

  if (loadingClients) {
    return (
      <LoadingState
        icon={UserRound}
        title="Préparation du courriel"
        description="Chargement des destinataires…"
      />
    );
  }

  const effectiveClientId = doc.clientId || clients[0]?.id || "";
  const previewDoc = { ...doc, clientId: effectiveClientId };
  const selectedClient = clients.find((c) => c.id === effectiveClientId);
  const alreadySigned = doc.status === "signed" || doc.status === "sent";

  const persistDraft = async () => {
    if (!effectiveClientId) {
      toast.error("Sélectionnez un client");
      return null;
    }
    const draft = { ...doc, clientId: effectiveClientId, status: "draft" as const };
    const saved = await upsertMutation.mutateAsync({
      ...(initial?.id && !initial.id.startsWith("d-") ? { id: draft.id } : {}),
      type: "letter",
      number: draft.number,
      clientId: draft.clientId,
      status: "draft",
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
    setDoc((d) => ({ ...d, ...saved, id: saved.id }));
    return saved;
  };

  const save = async () => {
    try {
      const saved = await persistDraft();
      if (!saved) return;
      toast.success("Courriel enregistré", { description: saved.number });
      void navigate({ to: "/lettre/$id", params: { id: saved.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    }
  };

  const requestSignature = async () => {
    try {
      const saved = await persistDraft();
      if (!saved) return;
      await requestSignMutation.mutateAsync(saved.id);
      toast.success("Demande de signature envoyée", {
        description: "Un administrateur doit relire et signer le courriel.",
      });
      void navigate({ to: "/lettre/$id", params: { id: saved.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demande impossible");
    }
  };

  const signNow = async () => {
    try {
      const saved = await persistDraft();
      if (!saved) return;
      await signMutation.mutateAsync(saved.id);
      toast.success("Courriel signé", {
        description: "Vous pouvez maintenant l’envoyer par e-mail.",
      });
      void navigate({ to: "/lettre/$id", params: { id: saved.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signature impossible");
    }
  };

  const sendSigned = async () => {
    try {
      let target = doc;
      if (!initial?.id || initial.id.startsWith("d-")) {
        const saved = await persistDraft();
        if (!saved) return;
        target = saved;
      }
      if (target.status !== "signed" && target.status !== "sent") {
        toast.error("Le courriel doit être signé avant l'envoi");
        void navigate({ to: "/lettre/$id", params: { id: target.id } });
        return;
      }
      const emailed = await sendEmailMutation.mutateAsync(target);
      toast.success("Courriel envoyé", {
        description: `${target.number} → ${emailed.to}`,
      });
      void navigate({ to: "/lettre" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible");
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

  const busy =
    upsertMutation.isPending ||
    requestSignMutation.isPending ||
    signMutation.isPending ||
    sendEmailMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
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
                  <div className="font-medium">
                    {clientRepresentativeLine(selectedClient) || "—"}
                  </div>
                  <div className="text-amber-900/80">
                    {clientDisplayName(selectedClient)}
                  </div>
                    <div className="text-amber-900/70">
                      {clientLetterPostalLine(selectedClient)}
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
          title="Contenu du courriel"
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
              label="Corps du courriel"
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
          hint={
            adminLike
              ? "En tant qu’administrateur (gérant), vous pouvez signer directement ce courriel. L’envoi e-mail n’est possible qu’après signature."
              : "Après enregistrement, demandez la signature de l’administrateur (gérant). L’envoi e-mail n’est possible qu’une fois le courriel signé."
          }
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
            disabled={busy}
            onClick={() => void save()}
          >
            <Save className="h-4 w-4" /> Enregistrer
          </Button>
          {!alreadySigned && adminLike && (
            <Button
              className="rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"
              disabled={busy}
              onClick={() => void signNow()}
            >
              <Stamp className="h-4 w-4" />
              {signMutation.isPending ? "Signature…" : "Signer"}
            </Button>
          )}
          {!alreadySigned && !adminLike && (
            <Button
              className="rounded-xl bg-amber-600 text-white hover:bg-amber-600/90"
              disabled={busy}
              onClick={() => void requestSignature()}
            >
              <PenLine className="h-4 w-4" />
              {requestSignMutation.isPending ? "Demande…" : "Demander la signature"}
            </Button>
          )}
          {alreadySigned && (
            <Button
              className="rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"
              disabled={busy}
              onClick={() => void sendSigned()}
            >
              <Send className="h-4 w-4" /> Envoyer
            </Button>
          )}
        </div>
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
  rows = 4,
  hint,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {hint ? (
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>
      ) : null}
      <textarea
        rows={rows}
        placeholder={placeholder}
        className={cn(
          "mt-1.5 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
          className,
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
