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
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { useClients, useSession } from "@/hooks/use-data";
import { clientLetterRecipientLines, formatClientBp } from "@/lib/client-address";
import {
  createMailMergeCampaign,
  getMailMergeCampaign,
  listMailMergeCampaigns,
  markMailMergeCampaignSent,
  rejectMailMergeSignature,
  requestMailMergeSignature,
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

type GuestRecipient = {
  name: string;
  sigle: string;
  contactName: string;
  representativeTitle: string;
  email: string;
  phone: string;
  address: string;
  bp: string;
  city: string;
  country: string;
  nif: string;
  rccm: string;
  activity: string;
};

const emptyGuest = (): GuestRecipient => ({
  name: "",
  sigle: "",
  contactName: "",
  representativeTitle: "",
  email: "",
  phone: "",
  address: "",
  bp: "",
  city: "",
  country: "Gabon",
  nif: "",
  rccm: "",
  activity: "",
});

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
    sigle: client.sigle || "",
    contact: client.contactName || client.name,
    qualite: client.representativeTitle || "",
    adresse: client.address,
    bp: formatClientBp(client.bp),
    ville: client.city,
    pays: client.country,
    nif: client.nif || "",
    rccm: client.rccm || "",
    activite: client.activity || "",
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
    recipientOverride: clientLetterRecipientLines(client).join("\n"),
  };
}

function statusLabel(status: MailMergeCampaign["status"]) {
  if (status === "draft") return "Brouillon";
  if (status === "pending_signature") return "Signature demandée";
  if (status === "signed") return "Signé";
  return "Envoyé";
}

function MailMergePage() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const canSign = session ? isAdmin(session.staff.role) : false;
  const { data: clients = [], isPending: loadingClients } = useClients();

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
  const [guests, setGuests] = useState<GuestRecipient[]>([]);
  const [guestDraft, setGuestDraft] = useState<GuestRecipient>(emptyGuest);
  const [showGuestForm, setShowGuestForm] = useState(false);
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

  const recipientCount = selectedIds.size + guests.length;
  const isCreator = Boolean(
    session?.staff.id &&
      activeCampaign?.createdById === session.staff.id,
  );

  const createMutation = useMutation({
    mutationFn: () =>
      createMailMergeCampaign({
        data: {
          clientIds: [...selectedIds],
          guests,
          subject,
          salutation,
          body,
          closing,
          signatoryTitle,
        },
      }),
    onSuccess: (campaign) => {
      toast.success(`Campagne créée — ${campaign.documentCount} courriel(s)`);
      void qc.invalidateQueries({ queryKey: campaignsKey });
      setActiveCampaignId(campaign.id);
      setView("detail");
      setGuests([]);
      setSelectedIds(new Set());
    },
    onError: (err) =>
      toast.error(humanAuthError(err, "Impossible de créer la campagne.")),
  });

  const requestSignMutation = useMutation({
    mutationFn: (id: string) => requestMailMergeSignature({ data: { id } }),
    onSuccess: (campaign) => {
      toast.success("Demande de signature envoyée aux administrateurs");
      void qc.invalidateQueries({ queryKey: campaignsKey });
      void qc.setQueryData([...campaignsKey, campaign.id], campaign);
    },
    onError: (err) =>
      toast.error(humanAuthError(err, "Demande impossible.")),
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

  const rejectSignMutation = useMutation({
    mutationFn: (id: string) => rejectMailMergeSignature({ data: { id } }),
    onSuccess: (campaign) => {
      toast.success("Demande refusée");
      void qc.invalidateQueries({ queryKey: campaignsKey });
      void qc.setQueryData([...campaignsKey, campaign.id], campaign);
    },
    onError: (err) =>
      toast.error(humanAuthError(err, "Refus impossible.")),
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
    if (recipientCount === 0) {
      toast.error("Sélectionnez ou ajoutez au moins un destinataire pour l'aperçu");
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
    if (recipientCount === 0) {
      toast.error("Sélectionnez ou ajoutez au moins un destinataire");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("L'objet et le corps sont requis");
      return;
    }
    createMutation.mutate();
  };

  const addGuest = () => {
    if (!guestDraft.name.trim() || !guestDraft.email.trim()) {
      toast.error("Dénomination et email requis pour un destinataire ponctuel");
      return;
    }
    setGuests((prev) => [...prev, guestDraft]);
    setGuestDraft(emptyGuest());
    setShowGuestForm(false);
  };

  const handleSendCampaign = async () => {
    if (!activeCampaign || !canSign) return;
    if (activeCampaign.status !== "signed") {
      toast.error("Signez d'abord la campagne avant l'envoi");
      return;
    }
    const docs = activeCampaign.documents ?? [];
    if (docs.length === 0) {
      toast.error("Aucun courriel dans cette campagne");
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
        const pdf = await buildDocumentPdfFromDoc(doc, { omitSignature: false });
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
        <ArrowLeft className="h-4 w-4" /> Retour aux courriels
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
                        {c.documentCount} courriel(s) · {c.issueDate}
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
                    ({recipientCount})
                  </span>
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setShowGuestForm((v) => !v)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Ponctuel
                </Button>
              </div>
              {showGuestForm && (
                <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    Destinataire non enregistré. Les champs optionnels alimentent les
                    variables du courrier ; s’ils sont vides, la variable correspondante
                    reste vide dans le texte.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Field label="Dénomination {{nom}} *" value={guestDraft.name} onChange={(v) => setGuestDraft({ ...guestDraft, name: v })} />
                    <Field label="Email *" value={guestDraft.email} onChange={(v) => setGuestDraft({ ...guestDraft, email: v })} />
                    <Field label="Sigle {{sigle}}" value={guestDraft.sigle} onChange={(v) => setGuestDraft({ ...guestDraft, sigle: v })} />
                    <Field label="Représentant {{contact}}" value={guestDraft.contactName} onChange={(v) => setGuestDraft({ ...guestDraft, contactName: v })} />
                    <Field label="Qualité {{qualite}}" value={guestDraft.representativeTitle} onChange={(v) => setGuestDraft({ ...guestDraft, representativeTitle: v })} />
                    <Field label="Téléphone" value={guestDraft.phone} onChange={(v) => setGuestDraft({ ...guestDraft, phone: v })} />
                    <Field label="Adresse / quartier {{adresse}}" value={guestDraft.address} onChange={(v) => setGuestDraft({ ...guestDraft, address: v })} />
                    <Field label="BP {{bp}}" value={guestDraft.bp} onChange={(v) => setGuestDraft({ ...guestDraft, bp: v })} />
                    <Field label="Ville {{ville}}" value={guestDraft.city} onChange={(v) => setGuestDraft({ ...guestDraft, city: v })} />
                    <Field label="Pays {{pays}}" value={guestDraft.country} onChange={(v) => setGuestDraft({ ...guestDraft, country: v })} />
                    <Field label="NIF {{nif}}" value={guestDraft.nif} onChange={(v) => setGuestDraft({ ...guestDraft, nif: v })} />
                    <Field label="RCCM {{rccm}}" value={guestDraft.rccm} onChange={(v) => setGuestDraft({ ...guestDraft, rccm: v })} />
                    <Field label="Activité {{activite}}" value={guestDraft.activity} onChange={(v) => setGuestDraft({ ...guestDraft, activity: v })} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setShowGuestForm(false)}>
                      Annuler
                    </Button>
                    <Button type="button" size="sm" className="rounded-xl" onClick={addGuest}>
                      Ajouter
                    </Button>
                  </div>
                </div>
              )}
              {guests.length > 0 && (
                <ul className="space-y-1">
                  {guests.map((g, i) => (
                    <li
                      key={`${g.email}-${i}`}
                      className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{g.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {g.email} · ponctuel
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-danger"
                        onClick={() =>
                          setGuests((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                type="text"
                placeholder="Filtrer les clients enregistrés…"
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
                Variables : <code>{"{{nom}}"}</code>, <code>{"{{sigle}}"}</code>,{" "}
                <code>{"{{contact}}"}</code>, <code>{"{{qualite}}"}</code>,{" "}
                <code>{"{{adresse}}"}</code>, <code>{"{{bp}}"}</code>,{" "}
                <code>{"{{ville}}"}</code>, <code>{"{{pays}}"}</code>,{" "}
                <code>{"{{nif}}"}</code>, <code>{"{{rccm}}"}</code>,{" "}
                <code>{"{{activite}}"}</code>
                <span className="mt-1 block">
                  Clients enregistrés : toutes les valeurs connues. Destinataires
                  ponctuels : uniquement les champs saisis (le reste reste vide).
                </span>
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
              disabled={recipientCount === 0 || selectedClients.length === 0}
              className="rounded-xl"
            >
              <Eye className="mr-2 h-4 w-4" />
              Aperçu
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || recipientCount === 0}
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
              description="Préparation des courriels…"
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
                      {activeCampaign.documentCount} courriel(s) ·{" "}
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
                    {!canSign &&
                      isCreator &&
                      activeCampaign.status === "draft" && (
                      <Button
                        className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20"
                        disabled={requestSignMutation.isPending}
                        onClick={() =>
                          requestSignMutation.mutate(activeCampaign.id)
                        }
                      >
                        {requestSignMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PenLine className="mr-2 h-4 w-4" />
                        )}
                        Demander la signature
                      </Button>
                    )}
                    {canSign &&
                      (activeCampaign.status === "draft" ||
                        activeCampaign.status === "pending_signature") && (
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
                    {canSign && activeCampaign.status === "pending_signature" && (
                      <Button
                        variant="outline"
                        className="rounded-xl border-danger/40 text-danger"
                        disabled={rejectSignMutation.isPending}
                        onClick={() =>
                          rejectSignMutation.mutate(activeCampaign.id)
                        }
                      >
                        {rejectSignMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Ban className="mr-2 h-4 w-4" />
                        )}
                        Refuser
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
