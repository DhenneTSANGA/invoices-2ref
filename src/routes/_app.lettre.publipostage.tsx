import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { useClients } from "@/hooks/use-data";
import { sendMailMerge } from "@/lib/mail-merge";
import type { Client, Document } from "@/store/types";

export const Route = createFileRoute("/_app/lettre/publipostage")({
  head: () => ({ meta: [{ title: "Publipostage — 2R Expertise Fiscale" }] }),
  component: MailMergePage,
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
    contact: client.contactName || client.name,
    adresse: client.address,
    ville: client.city,
    pays: client.country,
  };
}

function buildPreviewDoc(
  client: Client,
  subject: string,
  body: string,
  closing: string,
  signatoryTitle: string,
): Document {
  const vars = clientVars(client);
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `preview-${client.id}`,
    cabinet: client.cabinet,
    type: "letter",
    number: "PUB-APERCU",
    clientId: client.id,
    status: "draft",
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
    salutation: "",
    body: interpolate(body, vars),
    closing: interpolate(closing, vars),
    signatoryTitle,
  };
}

function MailMergePage() {
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("Relance de paiement — facture en souffrance");
  const [body, setBody] = useState(
    `Cher(e) {{contact}},\n\nNous nous permettons de vous rappeler que votre compte présente un solde impayé à ce jour.\n\nNous vous serions reconnaissants de bien vouloir procéder au règlement dans les meilleurs délais.\n\nNous restons à votre disposition pour tout échange utile.`,
  );
  const [closing, setClosing] = useState(
    "Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",
  );
  const [signatoryTitle, setSignatoryTitle] = useState("Expert-comptable");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<
    { clientId: string; clientName: string; success: boolean; error?: string }[] | null
  >(null);
  const [search, setSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const selectedClients = useMemo(
    () => clients.filter((c) => selectedIds.has(c.id)),
    [clients, selectedIds],
  );

  const previewClient =
    selectedClients[Math.min(previewIndex, Math.max(selectedClients.length - 1, 0))] ??
    null;

  const previewDoc = useMemo(() => {
    if (!previewClient) return null;
    return buildPreviewDoc(previewClient, subject, body, closing, signatoryTitle);
  }, [previewClient, subject, body, closing, signatoryTitle]);

  const openPreview = () => {
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

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === clients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(clients.map((c) => c.id)));
    }
  };

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  const handleSend = async () => {
    if (selectedIds.size === 0) {
      toast.error("Sélectionnez au moins un destinataire");
      return;
    }
    if (!subject.trim()) {
      toast.error("L'objet est requis");
      return;
    }
    setSending(true);
    setResults(null);
    try {
      const res = await sendMailMerge({
        data: {
          clientIds: [...selectedIds],
          subject,
          body,
          closing,
          signatoryTitle,
        },
      });
      setResults(res.details);
      if (res.failed === 0) {
        toast.success(`${res.sent} email(s) envoyé(s) avec succès`);
      } else {
        const firstError = res.details.find((d) => !d.success)?.error;
        toast.warning(`${res.sent} envoyé(s), ${res.failed} en échec`, {
          description: firstError,
          duration: 12_000,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
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
        title="Publipostage email"
        subtitle="Envoyez un courrier personnalisé à plusieurs destinataires en même temps."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="glass-panel space-y-3 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display font-semibold">
              <Users className="h-4 w-4" /> Destinataires
              <span className="text-xs font-normal text-muted-foreground">
                ({selectedIds.size}/{clients.length})
              </span>
            </h3>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-primary hover:underline"
            >
              {selectedIds.size === clients.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
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
              {filteredClients.length === 0 && (
                <li className="py-4 text-center text-sm text-muted-foreground">
                  Aucun client trouvé.
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="glass-panel space-y-4 rounded-3xl p-5">
          <h3 className="font-display font-semibold">Contenu du courrier</h3>

          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            <strong>Variables disponibles :</strong> <code>{"{{nom}}"}</code>,{" "}
            <code>{"{{contact}}"}</code>, <code>{"{{adresse}}"}</code>,{" "}
            <code>{"{{ville}}"}</code>, <code>{"{{pays}}"}</code>
          </div>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Objet
            </span>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>

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
              rows={2}
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Titre du signataire
            </span>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              value={signatoryTitle}
              onChange={(e) => setSignatoryTitle(e.target.value)}
            />
          </label>
        </div>
      </div>

      {results && (
        <div className="glass-panel rounded-3xl p-5">
          <h3 className="mb-3 font-display font-semibold">Résultats d'envoi</h3>
          {results.some((r) => !r.success) && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              Cause fréquente : le domaine de <code className="font-mono">RESEND_FROM_EMAIL</code>{" "}
              (<code className="font-mono">contact@2ref.ga</code>) doit être{" "}
              <strong>vérifié</strong> dans{" "}
              <a
                href="https://resend.com/domains"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Resend → Domains
              </a>
              . Sans domaine vérifié, Resend n'autorise l'envoi qu'à l'email de votre compte.
            </div>
          )}
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {results.map((r) => (
              <li
                key={r.clientId}
                className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm"
              >
                {r.success ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                )}
                <div className="min-w-0">
                  <div className="font-medium">{r.clientName}</div>
                  {r.error && (
                    <div className="mt-0.5 text-xs leading-relaxed text-red-700/90">{r.error}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={openPreview}
          disabled={selectedIds.size === 0}
          className="rounded-xl"
        >
          <Eye className="mr-2 h-4 w-4" />
          Aperçu
        </Button>
        <Button
          onClick={handleSend}
          disabled={sending || selectedIds.size === 0}
          className="rounded-xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95"
        >
          {sending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Envoyer à {selectedIds.size} destinataire{selectedIds.size > 1 ? "s" : ""}
        </Button>
      </div>

      {previewDoc && previewClient && (
        <DocumentPreviewModal
          doc={previewDoc}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}

      {previewOpen && selectedClients.length > 1 && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/15 bg-[#0F172A]/95 px-4 py-2.5 text-sm text-white shadow-xl backdrop-blur">
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-40"
            disabled={previewIndex <= 0}
            onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
            aria-label="Destinataire précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-48 text-center">
            <div className="text-[11px] text-white/60">
              Aperçu personnalisé {previewIndex + 1}/{selectedClients.length}
            </div>
            <div className="truncate font-medium">{previewClient?.name}</div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-40"
            disabled={previewIndex >= selectedClients.length - 1}
            onClick={() =>
              setPreviewIndex((i) => Math.min(selectedClients.length - 1, i + 1))
            }
            aria-label="Destinataire suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
