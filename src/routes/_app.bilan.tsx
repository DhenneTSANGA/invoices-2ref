import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  ChevronDown,
  Download,
  FileArchive,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClients } from "@/hooks/use-data";
import { canAccessDashboard } from "@/lib/roles";
import type { AppSession } from "@/lib/session.functions";
import { humanAuthError } from "@/lib/auth-errors";
import { documentTypeLabel } from "@/lib/document-status-labels";
import { EXPORT_PERIOD_MONTHS } from "@/lib/document-export-config";
import {
  createDocumentExportJob,
  dismissDocumentExportJob,
  listDocumentExportJobs,
  listDocumentExportPreview,
  type ExportPreviewDocument,
} from "@/lib/document-export.functions";
import type { DocumentExportJobView } from "@/lib/document-export";
import type { DocumentStatus, DocumentType } from "@/store/types";
import { currency, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_app/bilan")({
  head: () => ({ meta: [{ title: "Bilan — 2R Hub" }] }),
  beforeLoad: ({ context }) => {
    const session = (context as { session?: NonNullable<AppSession> }).session;
    if (session && !canAccessDashboard(session.staff.role)) {
      throw redirect({ to: "/home" });
    }
  },
  component: BilanPage,
});

const jobsKey = ["document-export-jobs"] as const;

type ExportFormat = "zip" | "csv" | "both";

function formatLabel(format: ExportFormat) {
  if (format === "zip") return "ZIP (PDF)";
  if (format === "csv") return "CSV";
  return "ZIP + CSV";
}

function CompletedExportLinks({ job }: { job: DocumentExportJobView }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {job.total} document(s)
        {job.skippedCount > 0 ? ` · ${job.skippedCount} PDF absent(s)` : ""}
      </p>
      {job.errorMessage ? (
        <p className="text-xs text-amber-700">{job.errorMessage}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {job.zipUrl ? (
          <a
            href={job.zipUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <FileArchive className="h-4 w-4" />
            ZIP
          </a>
        ) : null}
        {job.csvUrl ? (
          <a
            href={job.csvUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <FileSpreadsheet className="h-4 w-4" />
            CSV
          </a>
        ) : null}
      </div>
    </div>
  );
}

function BilanPage() {
  const qc = useQueryClient();
  const { data: clients = [], isPending: loadingClients } = useClients();

  const [documentType, setDocumentType] = useState<DocumentType | "all" | "">("");
  const [clientId, setClientId] = useState("");
  const [months, setMonths] = useState<number>(1);
  const [format, setFormat] = useState<ExportFormat | null>(null);
  const [searchKey, setSearchKey] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastExport, setLastExport] = useState<DocumentExportJobView | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const searchParams = useMemo(() => {
    if (!searchKey || !documentType) return null;
    return {
      months,
      documentType: documentType === "all" ? undefined : documentType,
      clientId: clientId || undefined,
    };
  }, [searchKey, documentType, months, clientId]);

  const {
    data: previewResult,
    isFetching: loadingDocuments,
    isError: searchError,
  } = useQuery({
    queryKey: ["document-export-list", searchParams],
    queryFn: () => listDocumentExportPreview({ data: searchParams! }),
    enabled: searchParams !== null,
  });

  const documents = previewResult?.documents ?? [];

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: jobsKey,
    queryFn: () => listDocumentExportJobs(),
    enabled: historyOpen,
  });

  const selectedCount = selectedIds.size;

  const createMutation = useMutation({
    mutationFn: () => {
      if (!format || !documentType || selectedCount === 0) {
        throw new Error("Sélectionnez des documents et un format.");
      }
      return createDocumentExportJob({
        data: {
          format,
          months,
          documentType:
            documentType === "all" ? undefined : documentType,
          clientId: clientId || undefined,
          documentIds: [...selectedIds],
        },
      });
    },
    onSuccess: (job) => {
      setLastExport(job);
      if (job.status === "completed") {
        toast.success("Export prêt au téléchargement");
      } else {
        toast.error(job.errorMessage ?? "Export impossible");
      }
      if (historyOpen) {
        void qc.invalidateQueries({ queryKey: jobsKey });
      }
    },
    onError: (err) =>
      toast.error(humanAuthError(err, "Impossible de lancer l'export.")),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => dismissDocumentExportJob({ data: { id } }),
    onSuccess: () => {
      toast.success("Export retiré de la liste");
      void qc.invalidateQueries({ queryKey: jobsKey });
    },
    onError: (err) =>
      toast.error(humanAuthError(err, "Impossible de retirer l'export.")),
  });

  function resetSelection() {
    setFormat(null);
    setSelectedIds(new Set());
    setLastExport(null);
  }

  function handleFilterChange() {
    setSearchKey(null);
    resetSelection();
  }

  function handleSearch() {
    if (!documentType) {
      toast.error("Choisissez un type de document.");
      return;
    }
    resetSelection();
    setSearchKey(`${documentType}-${months}-${clientId}-${Date.now()}`);
  }

  // Sélectionner tous les résultats après chargement
  useEffect(() => {
    if (previewResult?.documents.length && searchKey) {
      setSelectedIds(new Set(previewResult.documents.map((d) => d.id)));
    }
  }, [previewResult, searchKey]);

  function toggleDocument(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastExport(null);
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
    setLastExport(null);
  }

  const allSelected =
    documents.length > 0 && documents.every((d) => selectedIds.has(d.id));

  const canExport =
    Boolean(searchKey) &&
    documents.length > 0 &&
    selectedCount > 0 &&
    format !== null;

  if (loadingClients) {
    return (
      <LoadingState
        icon={BarChart3}
        title="Espace Bilan"
        description="Chargement…"
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Bilan"
        subtitle="Consultez les documents éligibles, sélectionnez ceux à inclure, puis lancez l'export."
      />

      {/* Étape 1 — Filtres */}
      <div className="glass-panel space-y-5 rounded-3xl p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Étape 1
          </p>
          <h3 className="font-display font-semibold">Filtrer les documents</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Type de document
            </span>
            <select
              className="mt-1.5 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm"
              value={documentType}
              onChange={(e) => {
                setDocumentType(e.target.value as DocumentType | "all" | "");
                handleFilterChange();
              }}
            >
              <option value="">— Choisir un type —</option>
              <option value="all">Tous (factures, devis, courriels)</option>
              <option value="invoice">Factures payées</option>
              <option value="quotation">Devis acceptés</option>
              <option value="letter">Courriels signés / envoyés</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Période
            </span>
            <select
              className="mt-1.5 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm"
              value={months}
              onChange={(e) => {
                setMonths(Number(e.target.value));
                handleFilterChange();
              }}
            >
              {EXPORT_PERIOD_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m} dernier{m > 1 ? "s" : ""} mois
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Client (optionnel)
            </span>
            <select
              className="mt-1.5 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                handleFilterChange();
              }}
            >
              <option value="">Tous les clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-end">
          <Button
            className="rounded-xl"
            disabled={!documentType || loadingDocuments}
            onClick={handleSearch}
          >
            {loadingDocuments ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Afficher les documents
          </Button>
        </div>
      </div>

      {/* Étape 2 — Liste des documents */}
      {searchKey ? (
        <div className="glass-panel space-y-4 rounded-3xl p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              Étape 2
            </p>
            <h3 className="font-display font-semibold">Documents éligibles</h3>
            {previewResult ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {documents.length} document(s) du {shortDate(previewResult.dateFrom)}{" "}
                au {shortDate(previewResult.dateTo)} — cochez ceux à inclure.
              </p>
            ) : null}
          </div>

          {loadingDocuments ? (
            <LoadingState variant="inline" title="Chargement des documents" />
          ) : searchError ? (
            <p className="text-sm text-red-600">
              Impossible de charger la liste des documents.
            </p>
          ) : documents.length === 0 ? (
            <p className="rounded-xl bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
              Aucun document ne correspond à ces critères.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) => toggleAll(v === true)}
                        aria-label="Tout sélectionner"
                      />
                    </TableHead>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: ExportPreviewDocument) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(doc.id)}
                          onCheckedChange={() => toggleDocument(doc.id)}
                          aria-label={`Sélectionner ${doc.number}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{doc.number}</TableCell>
                      <TableCell>{documentTypeLabel(doc.type)}</TableCell>
                      <TableCell>{doc.clientName}</TableCell>
                      <TableCell>{shortDate(doc.issueDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={doc.status as DocumentStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        {doc.total != null ? currency(doc.total) : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            doc.hasPdf
                              ? "text-emerald-600"
                              : "text-muted-foreground"
                          }
                        >
                          {doc.hasPdf ? "Oui" : "Non"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-5">
          <p className="text-sm text-muted-foreground">
            Choisissez vos filtres puis cliquez sur « Afficher les documents »
            pour voir la liste avant d&apos;exporter quoi que ce soit.
          </p>
        </div>
      )}

      {/* Étape 3 — Format et export */}
      {searchKey && documents.length > 0 ? (
        <div className="glass-panel space-y-5 rounded-3xl p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              Étape 3
            </p>
            <h3 className="font-display font-semibold">Exporter la sélection</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedCount} document(s) sélectionné{selectedCount > 1 ? "s" : ""}.
              L&apos;export ne démarre que lorsque vous cliquez sur le bouton ci-dessous.
            </p>
          </div>

          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Format de téléchargement
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["zip", "ZIP (PDF)", FileArchive],
                  ["csv", "CSV (récap)", FileSpreadsheet],
                  ["both", "Les deux", Download],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setFormat(value);
                    setLastExport(null);
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                    format === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {lastExport?.status === "completed" ? (
              <CompletedExportLinks job={lastExport} />
            ) : (
              <span className="text-sm text-muted-foreground">
                {format
                  ? `Prêt à exporter en ${formatLabel(format).toLowerCase()}.`
                  : "Choisissez un format pour activer l'export."}
              </span>
            )}
            <Button
              className="rounded-xl bg-gradient-primary text-primary-foreground"
              disabled={createMutation.isPending || !canExport}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Lancer l&apos;export
            </Button>
          </div>
        </div>
      ) : null}

      {/* Historique — ouvert manuellement */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <div className="glass-panel rounded-3xl p-5">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <div>
                <h3 className="font-display font-semibold">Historique des exports</h3>
                <p className="text-sm text-muted-foreground">
                  Consultez ou retirez d&apos;anciens exports — rien ne se lance
                  automatiquement.
                </p>
              </div>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-muted-foreground transition ${
                  historyOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => void qc.invalidateQueries({ queryKey: jobsKey })}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Actualiser
              </Button>
            </div>

            {loadingJobs ? (
              <LoadingState variant="inline" title="Chargement de l'historique" />
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun export passé.</p>
            ) : (
              <ul className="space-y-3">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className="rounded-2xl border border-border/50 bg-surface/60 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">
                          {job.documentType
                            ? documentTypeLabel(job.documentType)
                            : "Tous les documents"}{" "}
                          · {job.months} mois
                          {job.clientName ? ` · ${job.clientName}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatLabel(job.format)} · {shortDate(job.dateFrom)} →{" "}
                          {shortDate(job.dateTo)} ·{" "}
                          {new Date(job.createdAt).toLocaleString("fr-FR")}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium uppercase">
                          {job.status === "completed"
                            ? "Terminé"
                            : job.status === "failed"
                              ? "Échec"
                              : job.status}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground"
                          title="Retirer de la liste"
                          disabled={dismissMutation.isPending}
                          onClick={() => dismissMutation.mutate(job.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      {job.status === "failed" ? (
                        <p className="text-sm text-red-600">
                          {job.errorMessage ?? "Échec"}
                        </p>
                      ) : (
                        <CompletedExportLinks job={job} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
