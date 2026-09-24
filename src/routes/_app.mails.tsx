import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Maximize2,
  RefreshCw,
  Reply,
  Send,
  FileText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import {
  useMail,
  useMails,
  useSyncMails,
  useClearMailHistory,
  useReplyToMail,
  useSession,
} from "@/hooks/use-data";
import { shortDate } from "@/lib/format";
import { bareEmail } from "@/lib/email";
import { cn } from "@/lib/utils";
import { isAdmin } from "@/lib/roles";
import type { MailListItem } from "@/lib/mail.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/mails")({
  head: () => ({ meta: [{ title: "Mails — 2R Hub" }] }),
  component: MailsPage,
});

type Conversation = {
  peerKey: string;
  peerLabel: string;
  messages: MailListItem[];
  lastAt: string;
  inboundCount: number;
  outboundCount: number;
};

function peerKeyFromMail(mail: MailListItem): string {
  const raw =
    mail.direction === "outbound" ? mail.toEmail : mail.fromEmail;
  return bareEmail(raw).toLowerCase() || raw.trim().toLowerCase();
}

function buildConversations(items: MailListItem[]): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const mail of items) {
    const key = peerKeyFromMail(mail);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        peerKey: key,
        peerLabel: key,
        messages: [mail],
        lastAt: mail.createdAt,
        inboundCount: mail.direction === "inbound" ? 1 : 0,
        outboundCount: mail.direction === "outbound" ? 1 : 0,
      });
    } else {
      existing.messages.push(mail);
      if (mail.createdAt > existing.lastAt) existing.lastAt = mail.createdAt;
      if (mail.direction === "inbound") existing.inboundCount += 1;
      else existing.outboundCount += 1;
    }
  }
  for (const conv of map.values()) {
    conv.messages.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );
}

function MailsPage() {
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const { data, isPending: isLoading, isFetching } = useMails("all");
  const { data: detail, isLoading: loadingDetail } = useMail(selectedId);
  const syncMutation = useSyncMails();
  const clearMutation = useClearMailHistory();
  const canClear = session?.staff.role
    ? isAdmin(session.staff.role)
    : false;

  const items = data?.items ?? [];
  const inboundHint = !data?.inboundConfigured;
  const conversations = useMemo(() => buildConversations(items), [items]);

  const activeConversation = useMemo(
    () =>
      conversations.find((c) => c.peerKey === selectedPeer) ??
      conversations[0] ??
      null,
    [conversations, selectedPeer],
  );

  useEffect(() => {
    if (!selectedPeer && conversations[0]) {
      setSelectedPeer(conversations[0].peerKey);
    }
  }, [conversations, selectedPeer]);

  useEffect(() => {
    if (!activeConversation) {
      setSelectedId(null);
      return;
    }
    const last = activeConversation.messages[activeConversation.messages.length - 1];
    if (last && (!selectedId || !activeConversation.messages.some((m) => m.id === selectedId))) {
      setSelectedId(last.id);
    }
  }, [activeConversation, selectedId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConversation?.peerKey, activeConversation?.messages.length]);

  const sync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (res) => {
        if (res.error) {
          toast.warning("Synchronisation partielle", {
            description: res.error,
            duration: 10_000,
          });
        } else {
          toast.success(
            res.imported > 0
              ? `${res.imported} message(s) synchronisé(s)`
              : "Boîte à jour",
          );
        }
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const clearHistory = () => {
    clearMutation.mutate(undefined, {
      onSuccess: (res) => {
        setClearOpen(false);
        setSelectedPeer(null);
        setSelectedId(null);
        toast.success(
          res.deleted > 0
            ? `${res.deleted} message(s) supprimé(s)`
            : "Historique déjà vide",
        );
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div>
      <PageHeader
        title="Espace mails"
        subtitle="Conversations avec vos clients — envois 2R Hub et réponses reçues."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canClear ? (
              <button
                type="button"
                onClick={() => setClearOpen(true)}
                disabled={clearMutation.isPending || items.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl border border-danger/30 bg-surface px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Vider l’historique
              </button>
            ) : null}
            <button
              type="button"
              onClick={sync}
              disabled={syncMutation.isPending || isFetching}
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  (syncMutation.isPending || isFetching) && "animate-spin",
                )}
              />
              Synchroniser
            </button>
          </div>
        }
      />

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vider l’historique des mails ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les messages envoyés et reçus seront supprimés de l’espace Mails.
              Les e-mails déjà partis chez les destinataires ne sont pas
              annulés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                clearHistory();
              }}
              disabled={clearMutation.isPending}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {clearMutation.isPending ? "Suppression…" : "Tout supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MailReaderModal
        open={readerOpen}
        onOpenChange={setReaderOpen}
        mail={detail && detail.id === selectedId ? detail : null}
        loading={Boolean(selectedId) && (loadingDetail || detail?.id !== selectedId)}
        canReply={Boolean(activeConversation && activeConversation.inboundCount > 0)}
        peerLabel={activeConversation?.peerLabel ?? ""}
      />

      {inboundHint && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
          Pour recevoir les réponses ici, activez{" "}
          <strong>Resend Inbound</strong> sur <code>2r-hub.com</code>. Les
          réponses clients notifieront aussi l’expéditeur (cloche).
        </div>
      )}

      {isLoading ? (
        <LoadingState
          icon={Mail}
          title="Chargement des mails"
          description="Récupération des conversations…"
        />
      ) : conversations.length === 0 ? (
        <div className="glass-panel rounded-3xl">
          <EmptyState
            icon={Inbox}
            title="Aucune conversation"
            description="Envoyez une facture ou un devis par e-mail, puis synchronisez les réponses clients."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
          <div className="glass-panel overflow-hidden rounded-3xl">
            <div className="border-b border-border/50 px-4 py-3">
              <h3 className="text-sm font-semibold">Conversations</h3>
              <p className="text-xs text-muted-foreground">
                {conversations.length} fil(s)
              </p>
            </div>
            <ul className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
              {conversations.map((conv) => {
                const last =
                  conv.messages[conv.messages.length - 1] ?? null;
                const active = conv.peerKey === activeConversation?.peerKey;
                return (
                  <li key={conv.peerKey}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPeer(conv.peerKey);
                        if (last) setSelectedId(last.id);
                      }}
                      className={cn(
                        "flex w-full flex-col gap-2 rounded-2xl border px-3 py-3 text-left transition",
                        active
                          ? "border-primary/40 bg-primary/10 shadow-sm"
                          : "border-border/50 bg-surface/60 hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {conv.peerLabel}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {shortDate(conv.lastAt)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <Send className="h-2.5 w-2.5" />
                          {conv.outboundCount}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <Reply className="h-2.5 w-2.5" />
                          {conv.inboundCount}
                        </span>
                      </div>
                      {last ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {last.direction === "outbound" ? "Vous : " : ""}
                          {last.subject}
                        </p>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="glass-panel flex min-h-[420px] flex-col overflow-hidden rounded-3xl">
            {!activeConversation ? (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
                <MailOpen className="mb-3 h-10 w-10 opacity-40" />
                Sélectionnez une conversation.
              </div>
            ) : (
              <>
                <div className="border-b border-border/50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-semibold">
                        {activeConversation.peerLabel}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {activeConversation.messages.length} message(s)
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedId && activeConversation.messages.length) {
                            setSelectedId(
                              activeConversation.messages[
                                activeConversation.messages.length - 1
                              ].id,
                            );
                          }
                          setReaderOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        Voir en grand
                      </button>
                      {detail?.documentId ? (
                        <Link
                          to="/documents"
                          search={{ focus: detail.documentId }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-muted"
                        >
                          <FileText className="h-3.5 w-3.5" /> Document lié
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
                  {activeConversation.messages.map((mail) => {
                    const outbound = mail.direction === "outbound";
                    const selected = mail.id === selectedId;
                    return (
                      <div
                        key={mail.id}
                        className={cn(
                          "flex w-full",
                          outbound ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedId(mail.id)}
                          onDoubleClick={() => {
                            setSelectedId(mail.id);
                            setReaderOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedId(mail.id);
                            }
                          }}
                          className={cn(
                            "max-w-[min(100%,28rem)] cursor-pointer rounded-3xl px-4 py-3 text-left shadow-sm transition",
                            outbound
                              ? "rounded-br-md bg-gradient-primary text-primary-foreground"
                              : "rounded-bl-md border border-border/60 bg-surface",
                            selected &&
                              (outbound
                                ? "ring-2 ring-white/50"
                                : "ring-2 ring-primary/40"),
                          )}
                        >
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                outbound
                                  ? "bg-white/20"
                                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                              )}
                            >
                              {outbound ? (
                                <>
                                  <Send className="h-2.5 w-2.5" /> Envoyé
                                </>
                              ) : (
                                <>
                                  <Reply className="h-2.5 w-2.5" /> Reçu
                                </>
                              )}
                            </span>
                            <span
                              className={cn(
                                "text-[10px]",
                                outbound
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground",
                              )}
                            >
                              {shortDate(mail.createdAt)}
                            </span>
                            <button
                              type="button"
                              title="Voir clairement"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(mail.id);
                                setReaderOpen(true);
                              }}
                              className={cn(
                                "ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full",
                                outbound
                                  ? "hover:bg-white/20"
                                  : "hover:bg-muted",
                              )}
                            >
                              <Maximize2 className="h-3 w-3" />
                            </button>
                          </div>
                          <p
                            className={cn(
                              "text-sm font-semibold leading-snug",
                              outbound
                                ? "text-primary-foreground"
                                : "text-foreground",
                            )}
                          >
                            {mail.subject}
                          </p>
                          {mail.preview ? (
                            <p
                              className={cn(
                                "mt-1 line-clamp-3 text-xs leading-relaxed",
                                outbound
                                  ? "text-primary-foreground/85"
                                  : "text-muted-foreground",
                              )}
                            >
                              {mail.preview}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={threadEndRef} />
                </div>

                <div className="border-t border-border/50 bg-surface/80 p-4">
                  {loadingDetail ? (
                    <LoadingState
                      icon={MailOpen}
                      title="Ouverture"
                      description="Chargement du message…"
                    />
                  ) : detail && detail.id === selectedId ? (
                    <div className="space-y-2">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setReaderOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-muted"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                          Voir clairement
                        </button>
                      </div>
                      <MailDetailBody mail={detail} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sélectionnez une bulle pour lire le contenu complet.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MailDetailBody({
  mail,
}: {
  mail: MailListItem & { htmlBody?: string | null; textBody?: string | null };
}) {
  const outbound = mail.direction === "outbound";
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        outbound
          ? "border-primary/25 bg-primary/5"
          : "border-emerald-500/25 bg-emerald-500/5",
      )}
    >
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">De</strong> {mail.fromEmail}
        </span>
        <span>
          <strong className="text-foreground">À</strong> {mail.toEmail}
        </span>
        {mail.ccEmail ? (
          <span>
            <strong className="text-foreground">Cc</strong> {mail.ccEmail}
          </span>
        ) : null}
        {mail.lastEvent ? <span>· {mail.lastEvent}</span> : null}
      </div>
      <MailBodyView mail={mail} compact />
    </div>
  );
}

type MailBody = MailListItem & {
  htmlBody?: string | null;
  textBody?: string | null;
};

function wrapEmailHtml(html: string) {
  const trimmed = html.trim();
  if (/^<!DOCTYPE/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    html,body{margin:0;padding:0;background:#ffffff;color:#0f172a;}
    body{padding:24px;font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.55;}
    img{max-width:100%;height:auto;}
    a{color:#2563eb;}
    table{border-collapse:collapse;}
  </style></head><body>${trimmed}</body></html>`;
}

function EmailHtmlFrame({
  html,
  title,
  className,
}: {
  html: string;
  title?: string;
  className?: string;
}) {
  return (
    <iframe
      title={title ?? "Contenu du mail"}
      srcDoc={wrapEmailHtml(html)}
      sandbox=""
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white",
        className,
      )}
      style={{ colorScheme: "light" }}
    />
  );
}

function MailBodyView({
  mail,
  compact,
}: {
  mail: MailBody;
  compact?: boolean;
}) {
  if (mail.htmlBody) {
    return (
      <EmailHtmlFrame
        html={mail.htmlBody}
        title={mail.subject}
        className={compact ? "min-h-[220px] h-[32vh]" : "h-full min-h-0"}
      />
    );
  }
  if (mail.textBody) {
    return (
      <pre
        className={cn(
          "whitespace-pre-wrap rounded-xl bg-white p-4 font-sans text-sm text-slate-900",
          compact ? "max-h-[32vh] overflow-auto" : "h-full overflow-auto",
        )}
      >
        {mail.textBody}
      </pre>
    );
  }
  if (mail.preview) {
    return (
      <p className="rounded-xl bg-white p-4 text-sm text-slate-700">{mail.preview}</p>
    );
  }
  return (
    <p className="text-sm italic text-muted-foreground">
      Contenu non disponible. Essayez Synchroniser.
    </p>
  );
}

function MailReaderModal({
  open,
  onOpenChange,
  mail,
  loading,
  canReply,
  peerLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mail: MailBody | null;
  loading: boolean;
  canReply: boolean;
  peerLabel: string;
}) {
  const [replyBody, setReplyBody] = useState("");
  const replyMutation = useReplyToMail();

  useEffect(() => {
    setReplyBody("");
  }, [mail?.id]);

  const sendReply = () => {
    if (!mail) return;
    const body = replyBody.trim();
    if (!body) {
      toast.error("Écrivez un message avant d’envoyer.");
      return;
    }
    replyMutation.mutate(
      { mailId: mail.id, body },
      {
        onSuccess: (res) => {
          setReplyBody("");
          toast.success(`Réponse envoyée à ${res.to}`);
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Envoi de la réponse impossible",
          );
        },
      },
    );
  };

  const outbound = mail?.direction === "outbound";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4 pr-12 text-left">
          <DialogTitle className="font-display text-lg leading-snug">
            {mail?.subject ?? "Lecture du mail"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-xs">
              {mail ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    <strong className="text-foreground">De</strong> {mail.fromEmail}
                  </span>
                  <span>
                    <strong className="text-foreground">À</strong> {mail.toEmail}
                  </span>
                  {mail.ccEmail ? (
                    <span>
                      <strong className="text-foreground">Cc</strong> {mail.ccEmail}
                    </span>
                  ) : null}
                  <span>{shortDate(mail.createdAt)}</span>
                  {peerLabel ? <span>· {peerLabel}</span> : null}
                  {mail.documentId ? (
                    <Link
                      to="/documents"
                      search={{ focus: mail.documentId }}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Document lié
                    </Link>
                  ) : null}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold uppercase tracking-wide",
                      outbound
                        ? "bg-primary/10 text-primary"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                    )}
                  >
                    {outbound ? "Envoyé" : "Reçu"}
                  </span>
                </div>
              ) : (
                "Le site reste en arrière-plan. Fermez avec Échap ou la croix."
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden bg-slate-200 p-3 dark:bg-slate-800">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Chargement du message…
            </div>
          ) : mail ? (
            <div className="h-full min-h-0">
              <MailBodyView mail={mail} />
            </div>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              Sélectionnez un message pour l’afficher ici.
            </p>
          )}
        </div>

        {canReply && mail ? (
          <div className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Reply className="h-3.5 w-3.5" />
              Répondre à {peerLabel || mail.fromEmail}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Votre réponse au client…"
                rows={3}
                disabled={replyMutation.isPending}
                className="min-h-[72px] flex-1 bg-white dark:bg-surface"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={replyMutation.isPending || !replyBody.trim()}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {replyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Envoyer
              </button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
