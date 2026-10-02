import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Plus, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { CompanyDialog } from "@/components/prospection/CrmForms";
import {
  CrmCard,
  CrmCardGrid,
  EntityMark,
  MetricTile,
  NextActionRow,
} from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN, FilterChip } from "@/components/prospection/CrmUi";
import { SITE_LABELS, managerName } from "@/lib/prospection-demo";
import { currency, shortDate } from "@/lib/format";
import { LineBadge } from "@/components/prospection/ProspectionBadges";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/clients/")({
  head: () => ({ meta: [{ title: "Clients — Prospection" }] }),
  component: CrmClientsPage,
});

function CrmClientsPage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const contacts = useProspectionDemoStore((s) => s.contacts);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const activities = useProspectionDemoStore((s) => s.activities);
  const [q, setQ] = useState("");
  const [strategic, setStrategic] = useState(false);
  const [open, setOpen] = useState(false);

  const list = useMemo(
    () =>
      companies.filter(
        (c) =>
          c.kind === "client" &&
          (!strategic || c.strategic) &&
          (q.trim() === "" || c.name.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [companies, q, strategic],
  );

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Portefeuille déjà en relation — hors factures."
        actions={
          <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
            <Plus className="h-4 w-4" />
            Nouveau client
          </button>
        }
      />
      <div className="glass-panel mb-4 flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un client…"
            className="w-full rounded-xl border border-border/60 bg-transparent py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <FilterChip active={strategic} onClick={() => setStrategic((v) => !v)}>
          Stratégiques uniquement
        </FilterChip>
      </div>
      <CrmCardGrid>
        {list.map((c, i) => {
          const primary =
            contacts.find((ct) => ct.companyId === c.id && ct.decisionMaker) ??
            contacts.find((ct) => ct.companyId === c.id) ??
            null;
          const last = activities
            .filter((a) => a.companyId === c.id)
            .map((a) => a.at)
            .sort()
            .at(-1);
          const openOps = opportunities.filter(
            (o) => o.companyId === c.id && o.stage !== "perdu" && o.stage !== "gagne",
          );
          const next = [...openOps]
            .filter((o) => o.nextAction)
            .sort((a, b) => a.nextActionOn.localeCompare(b.nextActionOn))[0];
          return (
            <Link key={c.id} to="/prospection/clients/$id" params={{ id: c.id }} className="block h-full">
              <CrmCard index={i} className="h-full">
                <div className="flex items-start gap-3">
                  <EntityMark name={c.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display text-base font-semibold leading-tight group-hover:text-primary">
                        {c.name}
                      </h2>
                      {c.strategic ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                          <Star className="h-3 w-3 fill-current" />
                          Stratégique
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {SITE_LABELS[c.site]}
                      </span>
                      {c.sector ? <span>· {c.sector}</span> : null}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.servicesBought.map((l) => (
                        <LineBadge key={l} line={l} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MetricTile
                    label="Contact"
                    value={primary ? `${primary.firstName} ${primary.lastName}` : "—"}
                    hint={primary?.role}
                  />
                  <MetricTile label="Manager" value={managerName(c.managerId)} />
                  <MetricTile label="CA signé" value={currency(c.caSigned)} accent />
                  <MetricTile
                    label="Opportunités"
                    value={`${openOps.length} ouverte${openOps.length > 1 ? "s" : ""}`}
                    hint={last ? `Dernier contact ${shortDate(last)}` : "Pas d’activité"}
                  />
                </div>
                <NextActionRow action={next?.nextAction} date={next?.nextActionOn} />
              </CrmCard>
            </Link>
          );
        })}
      </CrmCardGrid>
      <CompanyDialog open={open} onOpenChange={setOpen} kind="client" />
    </div>
  );
}
