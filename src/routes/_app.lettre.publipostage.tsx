import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Send,
  Loader2,
  Check,
  X,
  Users,
  Eye,
  ChevronLeft,
  ChevronRight,
  PenLine,
  Stamp,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { useClients, useSession } from "@/hooks/use-data";
import {
  createMailMergeCampaign,
  getMailMergeCampaign,
  listMailMergeCampaigns,
  markMailMergeCampaignSent,
  signMailMergeCampaign,
} from "@/lib/mail-merge";
import { sendDocumentEmail } from "@/lib/send-document-email";
import { buildDocumentPdfFromDoc } from "@/lib/pdf/downloadDocumentPdf";
import { isAdmin } from "@/lib/roles";
import { humanAuthError } from "@/lib/auth-errors";
import type { Client, Document, MailMergeCampaign } from "@/store/types";

export const Route = createFileRoute("/_app/lettre/publipostage")({
  head: () => ({ meta: [{ title: "Publipostage — 2R Hub" }] }),
  component: MailMergePage,
});

const campaignsKey = ["mail-merge-campaigns"] as const;

function interpolate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

function clientVars(client: Client): Record<string, string> {
  return {
    nom: client.name,
    contact: client.contactName || client.name,
    adresse: client.address,
    ville: client.city,
    pays: client.country,
  };
}

function buildPreviewDoc(
  client: Client,
  subject: string,
  salutation: string,
  body: string,
  closing: string,
  signatoryTitle: string,
  status: Document["status"] = "draft",
): Document {
  const vars = clientVars(client);
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `preview-${client.id}`,
    cabinet: client.cabinet,
    type: "letter",
    number: "LT-APERCU",
    clientId: client.id,
    status,
    issueDate: today,
    dueDate: today,
    items: [],
    subtotal: 0,
    tps: 0,
    css: 0,
    vat: 0,
    total: 0,
    currency: "XAF",
    subject: interpolate(subject, vars),
    salutation: interpolate(salutation, vars),
    body: interpolate(body, vars),
    closing: interpolate(closing, vars),
    signatoryTitle,
    recipientOverride: [
      client.contactName ? "À" : "",
      client.contactName || "",
      client.name ? `De ${client.name}` : "",
      [client.address, client.city, client.country].filter(Boolean).join(" — "),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function statusLabel(status: MailMergeCampaign["status"]) {
  if (status === "draft") return "Brouillon";
  if (status === "signed") return "Signé";
  return "Envoyé";
}

function MailMergePage() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const canSign = session ? isAdmin(session.staff.role) : false;
  const { data: clients = [], isLoading: loadingClients } = useClients();

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: campaignsKey,
    queryFn: () => listMailMergeCampaigns(),
  });

  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  const { data: activeCampaign, isLoading: loadingDetail } = useQuery({
    queryKey: [...campaignsKey, activeCampaignId],
    queryFn: () => getMailMergeCampaign({ data: { id: activeCampaignId! } }),
    enabled: Boolean(activeCampaignId) && view === "detail",
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [salutation, setSalutation] = useState("");
  const [body, setBody] = useState("");
  const [closing, setClosing] = useState("");
  const [signatoryTitle, setSignatoryTitle] = useState("Le Gérant");
  const [search, setSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<
    { documentId: string; label: string; success: boolean; error?: string }[] | null
  >(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createMailMergeCampaign({
        data: {
          clientIds: [...selectedIds],
          subject,
          salutation,
          body,
          closing,
          signatoryTitle,
        },
      }),
    onSuccess: (campaign) => {
      toast.success(`Campagne créée — ${campaign.documentCount} lettre(s)`);
      void qc.invalidateQueries({ queryKey: campaignsKey });
      setActiveCampaignId(campaign.id);
      setView("detail");
    },
    onError: (err) =>
      toast.error(humanAuthError(err, "Impossible de créer la campagne.")),
  });

  const signMutation = useMutation({
    mutationFn: (id: string) => signMailMergeCampaign({ data: { id } }),
    onSuccess: (campaign) => {
      toast.success("Campagne signée — cachet appliqué");
      void qc.invalidateQueries({ queryKey: campaignsKey });
      void qc.setQueryData([...campaignsKey, campaign.id], campaign);
    },
    onError: (err) =>
      toast.error(humanAuthError(err, "Impossible de signer la campagne.")),
  });

  const selectedClients = useMemo(
    () => clients.filter((c) => selectedIds.has(c.id)),
    [clients, selectedIds],
  );

  const previewClient =
    selectedClients[Math.min(previewIndex, Math.max(selectedClients.length - 1, 0))] ??
    null;

  const previewDoc = useMemo(() => {
    if (!previewClient) return null;
    return buildPreviewDoc(
      previewClient,
      subject,
      salutation,
      body,
      closing,
      signatoryTitle,
    );
  }, [previewClient, subject, salutation, body, closing, signatoryTitle]);

  const detailPreviewDoc = activeCampaign?.documents?.[previewIndex] ?? null;

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  const openCreatePreview = () => {
    if (selectedClients.length === 0) {
      toast.error("Sélectionnez au moins un destinataire pour l'aperçu");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("Renseignez l'objet et le corps avant l'aperçu");
      return;
    }
    setPreviewIndex(0);
    setPreviewOpen(true);
  };

  const handleCreate = () => {
    if (selectedIds.size === 0) {
      toast.error("Sélectionnez au moins un destinataire");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("L'objet et le corps sont requis");
      return;
    }
    createMutation.mutate();
  };

  const handleSendCampaign = async () => {
    if (!activeCampaign || !canSign) return;
    if (activeCampaign.status !== "signed") {
      toast.error("Signez d'abord la campagne avant l'envoi");
      return;
    }
    const docs = activeCampaign.documents ?? [];
    if (docs.length === 0) {
      toast.error("Aucune lettre dans cette campagne");
      return;
    }

    setSending(true);
    setSendResults(null);
    const results: {
      documentId: string;
      label: string;
      success: boolean;
      error?: string;
    }[] = [];
    const sentIds: string[] = [];

    for (const doc of docs) {
      if (doc.status === "sent") {
        results.push({
          documentId: doc.id,
          label: doc.number,
          success: true,
        });
        continue;
      }
      try {
        const pdf = await buildDocumentPdfFromDoc(doc);
        await sendDocumentEmail({
          data: {
            id: doc.id,
            pdfBase64: pdf.base64,
            fileName: pdf.fileName,
          },
        });
        sentIds.push(doc.id);
        results.push({
          documentId: doc.id,
          label: doc.number,
          success: true,
        });
      } catch (err) {
        results.push({
          documentId: doc.id,
          label: doc.number,
          success: false,
          error: err instanceof Error ? err.message : "Échec",
        });
      }
    }

    try {
      await markMailMergeCampaignSent({
        data: { id: activeCampaign.id, sentDocumentIds: sentIds },
      });
      void qc.invalidateQueries({ queryKey: campaignsKey });
      void qc.invalidateQueries({
        queryKey: [...campaignsKey, activeCampaign.id],
      });
    } catch (err) {
      toast.error(humanAuthError(err, "Envoi partiel — statut non mis à jour."));
    }

    setSendResults(results);
    const ok = results.filter((r) => r.success).length;
    const fail = results.filter((r) => !r.success).length;
    if (fail === 0) toast.success(`${ok} courrier(s) envoyé(s)`);
    else toast.warning(`${ok} envoyé(s), ${fail} en échec`);
    setSending(false);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <Link
        to="/lettre"
        className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux lettres
      </Link>
      <PageHeader
        title="Publipostage"
        subtitle="Créez les courriers, faites-les signer par un admin, puis envoyez-les."
        actions={
          view === "list" ? (
            <Button
              onClick={() => {
                setView("create");
                setSendResults(null);
              }}
              className="rounded-xl bg-gradient-primary text-primary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle campagne
            </Button>
          ) : (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setView("list");
                setActiveCampaignId(null);
                setPreviewOpen(false);
              }}
            >
              Liste des campagnes
            </Button>
          )
        }
      />

      {view === "list" && (
        <div className="glass-panel rounded-3xl p-5">
          {loadingCampaigns ? (
            <LoadingState
              variant="inline"
              icon={PenLine}
              title="Chargement"
              description="Récupération des campagnes…"
            />
          ) : campaigns.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune campagne. Créez-en une pour démarrer un publipostage.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-2 py-3 text-left hover:bg-muted/40 rounded-xl"
                    onClick={() => {
                      setActiveCampaignId(c.id);
                      setView("detail");
                      setSendResults(null);
                    }}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{c.subject}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.documentCount} lettre(s) · {c.issueDate}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                      {statusLabel(c.status)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {view === "create" && (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="glass-panel space-y-3 rounded-3xl p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display font-semibold">
                  <Users className="h-4 w-4" /> Destinataires
                  <span className="text-xs font-normal text-muted-foreground">
                    ({selectedIds.size}/{clients.length})
                  </span>
                </h3>
              </div>
              <input
                type="text"
                placeholder="Filtrer par nom ou email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              {loadingClients ? (
                <LoadingState
                  variant="inline"
                  icon={Users}
                  title="Chargement des destinataires"
                  description="Récupération de la liste des clients…"
                />
              ) : (
                <ul className="max-h-72 space-y-1 overflow-y-auto">
                  {filteredClients.map((c) => (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/70">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggle(c.id)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{c.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {c.email || "Pas d'email"} · {c.city}
                          </div>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass-panel space-y-4 rounded-3xl p-5">
              <h3 className="font-display font-semibold">Contenu du courrier</h3>
              <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                Variables : <code>{"{{nom}}"}</code>, <code>{"{{contact}}"}</code>,{" "}
                <code>{"{{adresse}}"}</code>, <code>{"{{ville}}"}</code>,{" "}
                <code>{"{{pays}}"}</code>
              </div>
              <Field
                label="Objet"
                value={subject}
                onChange={setSubject}
              />
              <Field
                label="Formule d'appel"
                value={salutation}
                onChange={setSalutation}
                placeholder="Monsieur le Directeur Général,"
              />
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Corps
                </span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Formule de politesse
                </span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                  rows={3}
                  value={closing}
                  onChange={(e) => setClosing(e.target.value)}
                />
              </label>
              <Field
                label="Titre du signataire"
                value={signatoryTitle}
                onChange={setSignatoryTitle}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={openCreatePreview}
              disabled={selectedIds.size === 0}
              className="rounded-xl"
            >
              <Eye className="mr-2 h-4 w-4" />
              Aperçu
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || selectedIds.size === 0}
              className="rounded-xl bg-gradient-primary text-primary-foreground"
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PenLine className="mr-2 h-4 w-4" />
              )}
              Enregistrer la campagne
            </Button>
          </div>
        </>
      )}

      {view === "detail" && (
        <div className="space-y-4">
          {loadingDetail || !activeCampaign ? (
            <LoadingState
              icon={PenLine}
              title="Chargement de la campagne"
              description="Préparation des lettres…"
            />
          ) : (
            <>
              <div className="glass-panel rounded-3xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      {statusLabel(activeCampaign.status)}
                    </div>
                    <h3 className="font-display text-lg font-semibold">
                      {activeCampaign.subject}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activeCampaign.documentCount} lettre(s) ·{" "}
                      {activeCampaign.issueDate}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        setPreviewIndex(0);
                        setPreviewOpen(true);
                      }}
                      disabled={!activeCampaign.documents?.length}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Aperçu
                    </Button>
                    {canSign && activeCampaign.status === "draft" && (
                      <Button
                        className="rounded-xl bg-gradient-accent text-accent-foreground"
                        disabled={signMutation.isPending}
                        onClick={() => signMutation.mutate(activeCampaign.id)}
                      >
                        {signMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Stamp className="mr-2 h-4 w-4" />
                        )}
                        Signer / Cachet
                      </Button>
                    )}
                    {canSign && activeCampaign.status === "signed" && (
                      <Button
                        className="rounded-xl bg-gradient-primary text-primary-foreground"
                        disabled={sending}
                        onClick={() => void handleSendCampaign()}
                      >
                        {sending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Envoyer
                      </Button>
                    )}
                  </div>
                </div>

                <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto">
                  {(activeCampaign.documents ?? []).map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{d.number}</span>
                      <span className="text-xs text-muted-foreground">
                        {d.status === "draft"
                          ? "Brouillon"
                          : d.status === "signed"
                            ? "Signé"
                            : "Envoyé"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {sendResults && (
                <div className="glass-panel rounded-3xl p-5">
                  <h3 className="mb-3 font-display font-semibold">Résultats d'envoi</h3>
                  <ul className="max-h-56 space-y-2 overflow-y-auto">
                    {sendResults.map((r) => (
                      <li
                        key={r.documentId}
                        className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm"
                      >
                        {r.success ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        ) : (
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium">{r.label}</div>
                          {r.error && (
                            <div className="text-xs text-red-700/90">{r.error}</div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {(previewDoc || detailPreviewDoc) && (
        <DocumentPreviewModal
          doc={
            view === "detail" && detailPreviewDoc
              ? detailPreviewDoc
              : previewDoc!
          }
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}

      {previewOpen &&
        ((view === "create" && selectedClients.length > 1) ||
          (view === "detail" && (activeCampaign?.documents?.length ?? 0) > 1)) && (
          <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/15 bg-[#0F172A]/95 px-4 py-2.5 text-sm text-white shadow-xl backdrop-blur">
            <button
              type="button"
              className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-40"
              disabled={previewIndex <= 0}
              onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-48 text-center">
              <div className="text-[11px] text-white/60">
                Aperçu {previewIndex + 1}/
                {view === "detail"
                  ? activeCampaign?.documents?.length ?? 0
                  : selectedClients.length}
              </div>
              <div className="truncate font-medium">
                {view === "detail"
                  ? detailPreviewDoc?.number
                  : previewClient?.name}
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-40"
              disabled={
                previewIndex >=
                (view === "detail"
                  ? (activeCampaign?.documents?.length ?? 1) - 1
                  : selectedClients.length - 1)
              }
              onClick={() =>
                setPreviewIndex((i) =>
                  Math.min(
                    (view === "detail"
                      ? (activeCampaign?.documents?.length ?? 1)
                      : selectedClients.length) - 1,
                    i + 1,
                  ),
                )
              }
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
