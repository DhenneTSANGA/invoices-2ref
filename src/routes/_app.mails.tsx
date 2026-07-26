import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Inbox,
  Mail,
  MailOpen,
  RefreshCw,
  Reply,
  Send,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { useMail, useMails, useSyncMails } from "@/hooks/use-data";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MailListItem } from "@/lib/mail.functions";

export const Route = createFileRoute("/_app/mails")({
  head: () => ({ meta: [{ title: "Mails — 2R" }] }),
  component: MailsPage,
});

type Tab = "outbound" | "inbound";

function MailsPage() {
  const [tab, setTab] = useState<Tab>("outbound");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isFetching } = useMails(tab);
  const { data: detail, isLoading: loadingDetail } = useMail(selectedId);
  const syncMutation = useSyncMails();

  const items = data?.items ?? [];
  const inboundHint = !data?.inboundConfigured;

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

  const selected = useMemo(
    () => items.find((m) => m.id === selectedId) ?? null,
    [items, selectedId],
  );

  return (
    <div>
      <PageHeader
        title="Espace mails"
        subtitle="Historique des e-mails envoyés et des réponses reçues."
        actions={
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
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <TabBtn
          active={tab === "outbound"}
          onClick={() => {
            setTab("outbound");
            setSelectedId(null);
          }}
          icon={Send}
          label="Envoyés"
          count={tab === "outbound" ? items.length : undefined}
        />
        <TabBtn
          active={tab === "inbound"}
          onClick={() => {
            setTab("inbound");
            setSelectedId(null);
          }}
          icon={Inbox}
          label="Réponses / reçus"
          count={tab === "inbound" ? items.length : undefined}
        />
      </div>

      {tab === "inbound" && inboundHint && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
          Pour recevoir les réponses ici, configurez{" "}
          <strong>Resend Inbound</strong> sur votre domaine et ajoutez{" "}
          <code className="rounded bg-black/5 px-1">RESEND_REPLY_TO</code> dans
          le <code className="rounded bg-black/5 px-1">.env</code> (adresse de
          réception). Les nouveaux envois utiliseront cette adresse en Reply-To.
        </div>
      )}

      {isLoading ? (
        <LoadingState
          icon={Mail}
          title="Chargement des mails"
          description="Récupération de l’historique…"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="glass-panel overflow-hidden rounded-3xl">
            {items.length === 0 ? (
              <EmptyState
                icon={tab === "outbound" ? Send : Inbox}
                title={
                  tab === "outbound"
                    ? "Aucun e-mail envoyé"
                    : "Aucune réponse reçue"
                }
                description={
                  tab === "outbound"
                    ? "Les envois de factures, devis et publipostages apparaîtront ici."
                    : "Cliquez sur Synchroniser après avoir activé Resend Inbound."
                }
              />
            ) : (
              <ul className="divide-y divide-border/50 max-h-[70vh] overflow-y-auto">
                {items.map((m) => (
                  <MailRow
                    key={m.id}
                    mail={m}
                    active={m.id === selectedId}
                    onSelect={() => setSelectedId(m.id)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="glass-panel rounded-3xl p-5 min-h-[320px]">
            {!selectedId ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <MailOpen className="mb-3 h-10 w-10 opacity-40" />
                Sélectionnez un message pour lire le contenu.
              </div>
            ) : loadingDetail ? (
              <LoadingState
                icon={MailOpen}
                title="Ouverture"
                description="Chargement du message…"
              />
            ) : detail ? (
              <MailDetail
                mail={detail}
                isReply={selected?.isReply ?? detail.isReply}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Message introuvable.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Send;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition",
        active
          ? "bg-gradient-primary text-primary-foreground shadow-glow"
          : "border border-border bg-surface hover:bg-muted",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {typeof count === "number" && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            active ? "bg-white/20" : "bg-muted",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function MailRow({
  mail,
  active,
  onSelect,
}: {
  mail: MailListItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-muted/60",
          active && "bg-primary/5",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-semibold">
            {mail.direction === "outbound" ? mail.toEmail : mail.fromEmail}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {shortDate(mail.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {mail.isReply && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
              <Reply className="h-2.5 w-2.5" /> Réponse
            </span>
          )}
          <span className="truncate text-sm">{mail.subject}</span>
        </div>
        {mail.preview ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{mail.preview}</p>
        ) : null}
      </button>
    </li>
  );
}

function MailDetail({
  mail,
  isReply,
}: {
  mail: MailListItem & { htmlBody?: string | null; textBody?: string | null };
  isReply: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/50 pb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold leading-snug">
              {mail.subject}
            </h2>
            {isReply && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                <Reply className="h-3 w-3" /> Réponse
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {shortDate(mail.createdAt)}
            {mail.lastEvent ? ` · ${mail.lastEvent}` : ""}
          </p>
        </div>
        {mail.documentId && (
          <Link
            to="/documents"
            search={{ focus: mail.documentId }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <FileText className="h-3.5 w-3.5" /> Document lié
          </Link>
        )}
      </div>

      <dl className="mt-3 grid gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-muted-foreground">De</dt>
          <dd className="min-w-0 break-all font-medium">{mail.fromEmail}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-muted-foreground">À</dt>
          <dd className="min-w-0 break-all font-medium">{mail.toEmail}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-2xl border border-border/60 bg-surface-2/40 p-4">
        {mail.htmlBody ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: mail.htmlBody }}
          />
        ) : mail.textBody ? (
          <pre className="whitespace-pre-wrap text-sm font-sans">{mail.textBody}</pre>
        ) : mail.preview ? (
          <p className="text-sm text-muted-foreground">{mail.preview}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            Contenu non disponible. Essayez Synchroniser.
          </p>
        )}
      </div>
    </div>
  );
}
