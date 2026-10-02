import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { NewOpportunityDialog } from "@/components/prospection/CrmForms";
import {
  CrmCard,
  CrmCardGrid,
  EntityMark,
  MetricTile,
} from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN, CrmSearchEmpty, CrmSearchField, FilterChip, ProposeLineButton, matchesSearch } from "@/components/prospection/CrmUi";
import { LineBadge } from "@/components/prospection/ProspectionBadges";
import {
  SERVICE_LINE_LABELS,
  SERVICE_LINES,
  SITE_LABELS,
  managerName,
  missingServices,
  type ServiceLine,
  type Site,
} from "@/lib/prospection-demo";
import { currency } from "@/lib/format";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/portefeuille")({
  head: () => ({ meta: [{ title: "Portefeuille — Prospection" }] }),
  component: PortefeuillePage,
});

function PortefeuillePage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const [site, setSite] = useState<"all" | Site>("all");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [cross, setCross] = useState<{ companyId: string; line: ServiceLine } | null>(null);

  const filtered = useMemo(
    () =>
      companies.filter((a) => {
        if (a.kind !== "client") return false;
        if (site !== "all" && a.site !== site) return false;
        return matchesSearch(
          query,
          a.name,
          a.sector,
          SITE_LABELS[a.site],
          managerName(a.managerId),
          a.notes,
          a.plan?.stakes,
          ...a.servicesBought.map((l) => SERVICE_LINE_LABELS[l]),
        );
      }),
    [companies, site, query],
  );

  const potential = filtered.reduce((s, c) => s + (c.plan?.feePotential ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Portefeuille"
        subtitle={`Bouton orange « À proposer » = créer une opportunité de vente croisée · potentiel ${currency(potential)}`}
        actions={
          <button type="button" className={CRM_PRIMARY_BTN} onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle opportunité
          </button>
        }
      />
      <CrmSearchField
        value={query}
        onChange={setQuery}
        label="Rechercher dans le portefeuille"
        placeholder="Rechercher un client, un site, un manager…"
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={site === "all"} onClick={() => setSite("all")}>
          Toutes implantations
        </FilterChip>
        {(Object.keys(SITE_LABELS) as Site[]).map((s) => (
          <FilterChip key={s} active={site === s} onClick={() => setSite(s)}>
            {SITE_LABELS[s]}
          </FilterChip>
        ))}
      </div>
      {filtered.length === 0 ? (
        <CrmSearchEmpty
          title="Aucun client"
          description="Aucun client du portefeuille ne correspond à cette recherche."
          onClear={query ? () => setQuery("") : undefined}
        />
      ) : (
      <CrmCardGrid>
        {filtered.map((a, i) => {
          const miss = missingServices(a);
          return (
            <CrmCard key={a.id} index={i} className="h-full">
              <div className="flex items-start gap-3">
                <EntityMark name={a.name} />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/prospection/clients/$id"
                    params={{ id: a.id }}
                    className="font-display text-base font-semibold hover:text-primary"
                  >
                    {a.name}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {SITE_LABELS[a.site]}
                    </span>
                    <span>· {managerName(a.managerId)}</span>
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MetricTile label="CA signé" value={currency(a.caSigned)} accent />
                <MetricTile
                  label="À proposer"
                  value={`${miss.length} ligne${miss.length > 1 ? "s" : ""}`}
                  hint={a.plan ? `Potentiel ${currency(a.plan.feePotential)}` : "Sans plan de compte"}
                />
              </div>
              <ul className="mt-4 space-y-2">
                {SERVICE_LINES.map((l) => {
                  const bought = a.servicesBought.includes(l);
                  return (
                    <li
                      key={l}
                      className="flex items-center justify-between gap-2 rounded-2xl bg-muted/40 px-3 py-2"
                    >
                      <LineBadge line={l} />
                      {bought ? (
                        <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          Acheté
                        </span>
                      ) : (
                        <ProposeLineButton
                          lineLabel={SERVICE_LINE_LABELS[l]}
                          onClick={() => setCross({ companyId: a.id, line: l })}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </CrmCard>
          );
        })}
      </CrmCardGrid>
      )}
      <NewOpportunityDialog open={createOpen} onOpenChange={setCreateOpen} />
      <NewOpportunityDialog
        open={Boolean(cross)}
        onOpenChange={(v) => {
          if (!v) setCross(null);
        }}
        defaultCompanyId={cross?.companyId}
        defaultLine={cross?.line}
      />
    </div>
  );
}
