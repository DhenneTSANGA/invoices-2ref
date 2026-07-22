import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Eye, Files, Search } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { DocumentCreatorInline } from "@/components/documents/DocumentCreatorCard";
import { useAllDocuments, useClients } from "@/hooks/use-data";
import { documentTypeLabel } from "@/lib/document-status-labels";
import { currency, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Document, DocumentType } from "@/store/types";

const searchSchema = z.object({
  focus: z.string().optional(),
  type: z.enum(["all", "invoice", "quotation", "proforma", "letter"]).optional(),
});

export const Route = createFileRoute("/_app/documents")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({ meta: [{ title: "Documents — 2R Expertise Fiscale" }] }),
  component: DocumentsHubPage,
});

const TYPE_FILTERS: { value: "all" | DocumentType; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "invoice", label: "Factures" },
  { value: "quotation", label: "Devis" },
  { value: "proforma", label: "Pro forma" },
  { value: "letter", label: "Lettres" },
];

function detailLink(doc: Document): {
  to: "/invoices/$id" | "/quotations/$id" | "/proformas/$id" | "/lettre/$id";
  params: { id: string };
} {
  switch (doc.type) {
    case "invoice":
      return { to: "/invoices/$id", params: { id: doc.id } };
    case "quotation":
      return { to: "/quotations/$id", params: { id: doc.id } };
    case "proforma":
      return { to: "/proformas/$id", params: { id: doc.id } };
    case "letter":
      return { to: "/lettre/$id", params: { id: doc.id } };
  }
}

function DocumentsHubPage() {
  const navigate = useNavigate();
  const { focus, type: typeParam } = Route.useSearch();
  const typeFilter = focus ? "all" : (typeParam ?? "all");
  const { data: documents = [], isLoading } = useAllDocuments(
    typeFilter === "all" ? undefined : typeFilter,
  );
  const { data: clients = [] } = useClients();
  const [q, setQ] = useState("");
  /** ID mis en surbrillance (indépendant du moment où le DOM est prêt). */
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter((d) => {
      const client = clients.find((c) => c.id === d.clientId);
      const creator = d.createdBy
        ? `${d.createdBy.firstName} ${d.createdBy.lastName}`
        : "";
      return `${d.number} ${client?.name ?? ""} ${creator} ${documentTypeLabel(d.type)}`
        .toLowerCase()
        .includes(term);
    });
  }, [documents, clients, q]);

  // Dès qu'un focus arrive dans l'URL, activer la surbrillance tout de suite
  useEffect(() => {
    if (!focus) return;
    setHighlightedId(focus);
    setQ("");
  }, [focus]);

  // Scroll + maintien 5s, avec retries si la carte n'est pas encore montée
  useEffect(() => {
    if (!focus || isLoading) return;
    const inList = documents.some((d) => d.id === focus);
    if (!inList) return;

    let cancelled = false;
    let attempts = 0;

    const tryScroll = () => {
      if (cancelled) return;
      const el = window.document.getElementById(`doc-${focus}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      attempts += 1;
      if (attempts < 30) {
        window.requestAnimationFrame(tryScroll);
      }
    };

    tryScroll();

    const clearTimer = window.setTimeout(() => {
      if (cancelled) return;
      setHighlightedId(null);
      void navigate({
        to: "/documents",
        search: (prev) => ({ ...prev, focus: undefined }),
        replace: true,
      });
    }, 5000);

    return () => {
      cancelled = true;
      window.clearTimeout(clearTimer);
    };
  }, [focus, isLoading, documents, navigate]);

  const setTypeFilter = (value: "all" | DocumentType) => {
    void navigate({
      to: "/documents",
      search: (prev) => ({
        ...prev,
        type: value === "all" ? undefined : value,
        focus: undefined,
      }),
    });
  };

  return (
    <div>
      <PageHeader
        title="Tous les documents"
        subtitle="Vue cabinet — factures, devis, pro forma et lettres de tous les collaborateurs."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={cn(
              "rounded-2xl px-3.5 py-1.5 text-sm font-medium transition-colors",
              typeFilter === f.value
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "border border-border bg-surface hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="glass-panel mb-4 rounded-2xl p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par numéro, client ou créateur…"
            className="w-full rounded-xl border border-border/60 bg-transparent py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          Chargement des documents…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Files}
          title="Aucun document"
          description="Les documents créés par l'équipe apparaîtront ici."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doc, i) => {
            const client = clients.find((c) => c.id === doc.clientId);
            const focused = highlightedId === doc.id || focus === doc.id;
            return (
              <motion.li
                key={doc.id}
                id={`doc-${doc.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className={cn(
                  "scroll-mt-24 min-w-0 rounded-3xl p-4 transition-all duration-300 sm:p-5",
                  focused
                    ? "border-2 border-yellow-400 bg-yellow-100 shadow-[0_0_0_4px_rgba(250,204,21,0.45)] dark:bg-yellow-400/25"
                    : "glass-panel",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {documentTypeLabel(doc.type)}
                    </div>
                    <div className="mt-0.5 truncate font-display text-lg font-semibold">
                      {doc.number}
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>

                <div className="mt-3 space-y-1 text-sm">
                  <div className="truncate text-muted-foreground">
                    {client?.name ?? "Client inconnu"}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Émis le {shortDate(doc.issueDate)}</span>
                    {doc.type !== "letter" && (
                      <span className="font-numeric font-semibold text-foreground">
                        {currency(doc.total, doc.currency)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-border/60 pt-3">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Créé par
                  </div>
                  <DocumentCreatorInline creator={doc.createdBy} />
                </div>

                <div className="mt-4">
                  <Link
                    {...detailLink(doc)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Eye className="h-4 w-4" /> Voir les détails
                  </Link>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
