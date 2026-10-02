import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { AccountPlanDialog, NewActivityDialog, NewOpportunityDialog } from "@/components/prospection/CrmForms";
import {
  CrmCard,
  CrmCardGrid,
  EntityMark,
  MetricTile,
  NextActionRow,
} from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN } from "@/components/prospection/CrmUi";
import { LineBadge, StageBadge } from "@/components/prospection/ProspectionBadges";
import { ACTIVE_STAGES, managerName, type Company } from "@/lib/prospection-demo";
import { currency, shortDate } from "@/lib/format";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/port-gentil")({
  head: () => ({ meta: [{ title: "Port-Gentil — Prospection" }] }),
  component: PortGentilPage,
});

function PortGentilPage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const activities = useProspectionDemoStore((s) => s.activities);
  const six = companies.filter((c) => c.site === "port_gentil" && c.strategic);
  const [planFor, setPlanFor] = useState<Company | null>(null);
  const [oppFor, setOppFor] = useState<string | null>(null);
  const [actFor, setActFor] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Port-Gentil"
        subtitle="Les 6 clients stratégiques — présence locale et ventes additionnelles."
        actions={
          <button type="button" className={CRM_PRIMARY_BTN} onClick={() => setCreateOpen(true)}>
            Nouvelle opportunité
          </button>
        }
      />
      <CrmCardGrid dense>
        {six.map((c, i) => {
          const ops = opportunities.filter((o) => o.companyId === c.id);
          const last = activities
            .filter((a) => a.companyId === c.id)
            .map((a) => a.at)
            .sort()
            .at(-1);
          const next = ops
            .filter((o) => ACTIVE_STAGES.includes(o.stage))
            .sort((a, b) => a.nextActionOn.localeCompare(b.nextActionOn))[0];
          return (
            <CrmCard key={c.id} index={i} className="h-full">
              <div className="flex items-start gap-3">
                <EntityMark name={c.name} />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/prospection/clients/$id"
                    params={{ id: c.id }}
                    className="font-display text-base font-semibold hover:text-primary"
                  >
                    {c.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {managerName(c.managerId)} · plan {c.plan ? "rédigé" : "à faire"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.servicesBought.map((l) => (
                      <LineBadge key={l} line={l} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MetricTile label="CA signé" value={currency(c.caSigned)} accent />
                <MetricTile
                  label="Potentiel"
                  value={currency(c.plan?.feePotential ?? 0)}
                  hint={last ? `Dernier contact ${shortDate(last)}` : "Pas d’activité"}
                />
              </div>
              {ops.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {ops.map((o) => (
                    <StageBadge key={o.id} stage={o.stage} />
                  ))}
                </div>
              ) : null}
              <NextActionRow action={next?.nextAction} date={next?.nextActionOn} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={CRM_PRIMARY_BTN + " !py-2 !text-xs"} onClick={() => setPlanFor(c)}>
                  Plan de compte
                </button>
                <button
                  type="button"
                  className={CRM_SECONDARY_BTN + " !py-2 !text-xs"}
                  onClick={() => setOppFor(c.id)}
                >
                  Opportunité
                </button>
                <button
                  type="button"
                  className={CRM_SECONDARY_BTN + " !py-2 !text-xs"}
                  onClick={() => setActFor(c.id)}
                >
                  Prochaine action
                </button>
              </div>
            </CrmCard>
          );
        })}
      </CrmCardGrid>
      <AccountPlanDialog
        open={Boolean(planFor)}
        onOpenChange={(v) => {
          if (!v) setPlanFor(null);
        }}
        company={planFor}
      />
      <NewOpportunityDialog open={createOpen} onOpenChange={setCreateOpen} />
      <NewOpportunityDialog
        open={Boolean(oppFor)}
        onOpenChange={(v) => {
          if (!v) setOppFor(null);
        }}
        defaultCompanyId={oppFor ?? undefined}
      />
      <NewActivityDialog
        open={Boolean(actFor)}
        onOpenChange={(v) => {
          if (!v) setActFor(null);
        }}
        defaultCompanyId={actFor ?? undefined}
        defaultKind="visite"
      />
    </div>
  );
}
