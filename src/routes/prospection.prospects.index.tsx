import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, MapPin, Plus, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { LineBadge } from "@/components/prospection/ProspectionBadges";
import {
  CrmCard,
  CrmCardGrid,
  EntityMark,
  MetricTile,
  NextActionRow,
} from "@/components/prospection/CrmCards";
import { CompanyDialog } from "@/components/prospection/CrmForms";
import { CRM_PRIMARY_BTN, CrmSelect, FilterChip } from "@/components/prospection/CrmUi";
import { currency, shortDate } from "@/lib/format";
import {
  MANAGERS,
  SERVICE_LINE_LABELS,
  SERVICE_LINES,
  SITE_LABELS,
  managerName,
  type ServiceLine,
  type Site,
} from "@/lib/prospection-demo";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { useProspectionCompanies } from "@/hooks/use-prospection-companies";

export const Route = createFileRoute("/prospection/prospects/")({
  head: () => ({ meta: [{ title: "Prospects — Prospection" }] }),
  component: ProspectsPage,
});

function ProspectsPage() {
  const { companies } = useProspectionCompanies();
  const contacts = useProspectionDemoStore((s) => s.contacts);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const activities = useProspectionDemoStore((s) => s.activities);
  const [q, setQ] = useState("");
  const [siteFilter, setSiteFilter] = useState<"all" | Site>("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [lineFilter, setLineFilter] = useState<"all" | ServiceLine>("all");
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return companies.filter((c) => {
      if (c.kind !== "prospect") return false;
      if (siteFilter !== "all" && c.site !== siteFilter) return false;
      if (managerFilter !== "all" && c.managerId !== managerFilter) return false;
      if (lineFilter !== "all" && !c.targetLines.includes(lineFilter)) return false;
      if (!query) return true;
      const hay = `${c.name} ${c.sector} ${c.email} ${managerName(c.managerId)}`.toLowerCase();
      return hay.includes(query);
    });
  }, [companies, q, siteFilter, managerFilter, lineFilter]);

  const rows = useMemo(
    () =>
      list.map((c) => {
        const people = contacts.filter((ct) => ct.companyId === c.id);
        const primary = people.find((ct) => ct.decisionMaker) ?? people[0] ?? null;
        const ops = opportunities.filter((o) => o.companyId === c.id);
        const amount = ops.reduce((s, o) => s + o.amount, 0);
        const next = [...ops]
          .filter((o) => o.nextAction)
          .sort((a, b) => a.nextActionOn.localeCompare(b.nextActionOn))[0];
        const last = [...activities]
          .filter((a) => a.companyId === c.id)
          .sort((a, b) => b.at.localeCompare(a.at))[0];
        return { company: c, primary, amount, next, last, opCount: ops.length };
      }),
    [list, contacts, opportunities, activities],
  );

  return (
    <div>
      <PageHeader
        title="Prospects"
        subtitle={`${companies.filter((c) => c.kind === "prospect").length} entreprises en cours de qualification`}
        actions={
          <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
            <Plus className="h-4 w-4" />
            Nouveau prospect
          </button>
        }
      />

      <div className="glass-panel mb-4 space-y-3 rounded-2xl p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher une entreprise, un secteur, un manager…"
              className="w-full rounded-xl border border-border/60 bg-transparent py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <CrmSelect
              value={siteFilter}
              onChange={(value) => setSiteFilter(value as "all" | Site)}
              placeholder="Tous les sites"
              options={[
                { value: "all", label: "Tous les sites" },
                ...Object.entries(SITE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
              className="w-auto min-w-44 bg-surface"
            />
            <CrmSelect
              value={managerFilter}
              onChange={setManagerFilter}
              placeholder="Tous les managers"
              options={[
                { value: "all", label: "Tous les managers" },
                ...MANAGERS.map((m) => ({ value: m.id, label: m.name })),
              ]}
              className="w-auto min-w-48 bg-surface"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={lineFilter === "all"} onClick={() => setLineFilter("all")}>
            Toutes les lignes
          </FilterChip>
          {SERVICE_LINES.map((line) => (
            <FilterChip key={line} active={lineFilter === line} onClick={() => setLineFilter(line)}>
              {SERVICE_LINE_LABELS[line]}
            </FilterChip>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun prospect"
          description="Ajustez la recherche ou créez une nouvelle entreprise."
          action={
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
            >
              + Nouveau prospect
            </button>
          }
        />
      ) : (
        <CrmCardGrid>
          {rows.map(({ company: c, primary, amount, next, last, opCount }, i) => (
            <Link key={c.id} to="/prospection/prospects/$id" params={{ id: c.id }} className="block h-full">
              <CrmCard index={i} className="h-full">
                <div className="flex items-start gap-3">
                  <EntityMark name={c.name} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-base font-semibold leading-tight group-hover:text-primary">
                      {c.name}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {SITE_LABELS[c.site]}
                      </span>
                      {c.sector && c.sector !== "Prospect" ? <span>· {c.sector}</span> : null}
                      {c.size ? <span>· {c.size}</span> : null}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.targetLines.map((l) => (
                        <LineBadge key={l} line={l} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MetricTile
                    label="Contact"
                    value={primary ? `${primary.firstName} ${primary.lastName}` : "À renseigner"}
                    hint={primary?.role || undefined}
                  />
                  <MetricTile
                    label="Manager"
                    value={managerName(c.managerId)}
                    hint={
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="h-3 w-3" />
                        {opCount} affaire{opCount > 1 ? "s" : ""}
                      </span>
                    }
                  />
                  <MetricTile label="Potentiel" value={amount ? currency(amount) : "—"} accent={amount > 0} />
                  <MetricTile
                    label="Dernière activité"
                    value={last ? shortDate(last.at) : "—"}
                    hint={last?.title}
                  />
                </div>
                <NextActionRow action={next?.nextAction} date={next?.nextActionOn} />
              </CrmCard>
            </Link>
          ))}
        </CrmCardGrid>
      )}

      <CompanyDialog open={open} onOpenChange={setOpen} kind="prospect" />
    </div>
  );
}
