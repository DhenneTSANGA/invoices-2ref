import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { FileQuestion, Library, Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { DossierWorkspace } from "@/components/dossier/DossierWorkspace";
import {
  ClientPoleBadge,
  FilterChip,
  PoleFilterChips,
} from "@/components/clients/ClientPolePicker";
import { useDossierDemoStore } from "@/store/useDossierDemoStore";
import { GED_KIND_LABELS, type GedKind } from "@/lib/dossier-demo";
import { memberVisibilityPole } from "@/lib/staff-pole";
import { useSession } from "@/hooks/use-data";
import { shortDate } from "@/lib/format";
import { isMember } from "@/lib/roles";
import type { ClientPole } from "@/lib/client-pole";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/ged")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({ meta: [{ title: "GED — 2R Hub" }] }),
  component: GedPage,
});

const KINDS = Object.keys(GED_KIND_LABELS) as GedKind[];

function GedPage() {
  const { q: qSearch } = Route.useSearch();
  const { data: session } = useSession();
  const assets = useDossierDemoStore((s) => s.assets);
  const toggleAssetMissing = useDossierDemoStore((s) => s.toggleAssetMissing);
  const memberPole = memberVisibilityPole(session?.staff);
  const poleLocked = session ? isMember(session.staff.role) : false;

  const [q, setQ] = useState(qSearch ?? "");
  const [poleFilter, setPoleFilter] = useState<"all" | ClientPole>("all");
  const [kind, setKind] = useState<"all" | GedKind>("all");

  useEffect(() => {
    if (qSearch != null) setQ(qSearch);
  }, [qSearch]);

  const scoped = useMemo(
    () => assets.filter((a) => !memberPole || a.pole === memberPole),
    [assets, memberPole],
  );

  const filtered = scoped.filter((a) => {
    const hay = `${a.clientName} ${a.name} ${GED_KIND_LABELS[a.kind]}`.toLowerCase();
    return (
      (poleFilter === "all" || a.pole === poleFilter) &&
      (kind === "all" || a.kind === kind) &&
      (q.trim() === "" || hay.includes(q.trim().toLowerCase()))
    );
  });

  const missing = scoped.filter((a) => a.missing).length;

  return (
    <DossierWorkspace>
      <PageHeader
        title="GED"
        subtitle="Pièces d’identité, fiscales et sociales — pas les PDF de factures."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pièces" value={scoped.length} icon={Library} />
        <StatCard
          label="Manquantes"
          value={missing}
          icon={FileQuestion}
          variant={missing ? "danger" : "success"}
        />
        <StatCard
          label="Classées"
          value={scoped.length - missing}
          icon={Library}
          variant="accent"
        />
      </div>

      <div className="glass-panel mb-4 rounded-2xl p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom de fichier, client…"
            className="w-full rounded-xl border border-border/60 bg-transparent py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {poleLocked ? null : (
        <div className="mb-3">
          <PoleFilterChips value={poleFilter} onChange={setPoleFilter} />
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={kind === "all"} onClick={() => setKind("all")}>
          Toutes catégories
        </FilterChip>
        {KINDS.map((k) => (
          <FilterChip key={k} active={kind === k} onClick={() => setKind(k)}>
            {GED_KIND_LABELS[k]}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Aucune pièce"
          description="La GED de démo n’est pas liée au stockage réel."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <article
              key={a.id}
              className={cn(
                "glass-panel rounded-3xl p-5",
                a.missing && "ring-1 ring-danger/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display font-semibold leading-snug">
                    {a.name}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {a.clientName}
                  </div>
                </div>
                <ClientPoleBadge pole={a.pole} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5 font-semibold uppercase tracking-wide">
                  {GED_KIND_LABELS[a.kind]}
                </span>
                <span>{a.year}</span>
                <span>{a.pages} p.</span>
                <span>Maj. {shortDate(a.updatedAt)}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleAssetMissing(a.id)}
                className={cn(
                  "mt-4 rounded-xl px-3 py-1.5 text-xs font-medium",
                  a.missing
                    ? "bg-danger/10 text-danger"
                    : "border border-border bg-surface hover:bg-muted",
                )}
              >
                {a.missing ? "Marquer comme reçue" : "Marquer manquante"}
              </button>
            </article>
          ))}
        </div>
      )}
    </DossierWorkspace>
  );
}
