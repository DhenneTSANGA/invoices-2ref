import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { FolderKanban, Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { ClientPoleBadge, FilterChip, PoleFilterChips } from "@/components/clients/ClientPolePicker";
import { TaxStatusBadge } from "@/components/dossier/DossierBadges";
import { useDossierDemoStore } from "@/store/useDossierDemoStore";
import {
  TAX_KIND_LABELS,
  TAX_STATUS_LABELS,
  type TaxFileKind,
  type TaxFileStatus,
} from "@/lib/dossier-demo";
import { memberVisibilityPole } from "@/lib/staff-pole";
import { useSession } from "@/hooks/use-data";
import { shortDate } from "@/lib/format";
import type { ClientPole } from "@/lib/client-pole";
import { isMember } from "@/lib/roles";

export const Route = createFileRoute("/_app/dossiers/")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({
    meta: [{ title: "Dossiers fiscaux — 2R Hub" }],
  }),
  component: DossiersIndexPage,
});

const KINDS = Object.keys(TAX_KIND_LABELS) as TaxFileKind[];
const STATUSES = Object.keys(TAX_STATUS_LABELS) as TaxFileStatus[];

function DossiersIndexPage() {
  const { q: qSearch } = Route.useSearch();
  const { data: session } = useSession();
  const files = useDossierDemoStore((s) => s.files);
  const memberPole = memberVisibilityPole(session?.staff);
  const poleLocked = session ? isMember(session.staff.role) : false;

  const [q, setQ] = useState(qSearch ?? "");
  const [poleFilter, setPoleFilter] = useState<"all" | ClientPole>("all");
  const [kind, setKind] = useState<"all" | TaxFileKind>("all");
  const [status, setStatus] = useState<"all" | TaxFileStatus>("all");

  useEffect(() => {
    if (qSearch != null) setQ(qSearch);
  }, [qSearch]);

  const scoped = useMemo(() => {
    return files.filter((f) => !memberPole || f.pole === memberPole);
  }, [files, memberPole]);

  const filtered = scoped.filter((f) => {
    const hay = `${f.clientName} ${f.title} ${TAX_KIND_LABELS[f.kind]}`.toLowerCase();
    return (
      (poleFilter === "all" || f.pole === poleFilter) &&
      (kind === "all" || f.kind === kind) &&
      (status === "all" || f.status === status) &&
      (q.trim() === "" || hay.includes(q.trim().toLowerCase()))
    );
  });

  const overdue = scoped.filter((f) => f.status === "en_retard").length;
  const open = scoped.filter(
    (f) => f.status === "a_preparer" || f.status === "en_cours",
  ).length;

  return (
    <div>
      <PageHeader
        title="Dossiers fiscaux"
        subtitle="Déclarations et échéances par client — hors factures et devis."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Dossiers" value={scoped.length} icon={FolderKanban} />
        <StatCard label="Ouverts" value={open} icon={FolderKanban} variant="accent" />
        <StatCard
          label="En retard"
          value={overdue}
          icon={FolderKanban}
          variant={overdue ? "danger" : "success"}
        />
      </div>

      <div className="glass-panel mb-4 rounded-2xl p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Client, DSF, TVA, agrément…"
            className="w-full rounded-xl border border-border/60 bg-transparent py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {poleLocked ? null : (
        <div className="mb-3">
          <PoleFilterChips value={poleFilter} onChange={setPoleFilter} />
        </div>
      )}

      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={kind === "all"} onClick={() => setKind("all")}>
            Tous types
          </FilterChip>
          {KINDS.map((k) => (
            <FilterChip
              key={k}
              active={kind === k}
              onClick={() => setKind(k)}
            >
              {TAX_KIND_LABELS[k]}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={status === "all"} onClick={() => setStatus("all")}>
            Tous statuts
          </FilterChip>
          {STATUSES.map((st) => (
            <FilterChip
              key={st}
              active={status === st}
              onClick={() => setStatus(st)}
            >
              {TAX_STATUS_LABELS[st]}
            </FilterChip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Aucun dossier"
          description="Ajustez les filtres. Les données de démo peuvent aussi être réinitialisées."
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-surface/60">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Dossier</th>
                <th className="px-4 py-3 font-medium">Échéance</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Pilote</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const next = f.deadlines.find((d) => !d.done);
                return (
                  <tr
                    key={f.id}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to="/dossiers/$id"
                        params={{ id: f.id }}
                        className="font-semibold hover:text-primary"
                      >
                        {f.clientName}
                      </Link>
                      <div className="mt-1">
                        <ClientPoleBadge pole={f.pole} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{f.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {TAX_KIND_LABELS[f.kind]} · {f.year}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {next ? shortDate(next.dueOn) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <TaxStatusBadge status={f.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{f.manager}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
