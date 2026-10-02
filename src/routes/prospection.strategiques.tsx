import { createFileRoute, Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { AccountPlanDialog, NewActivityDialog, NewOpportunityDialog } from "@/components/prospection/CrmForms";
import { CrmCard, CrmCardGrid, EntityMark, MetricTile } from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN } from "@/components/prospection/CrmUi";
import { LineBadge } from "@/components/prospection/ProspectionBadges";
import { managerName, type Company } from "@/lib/prospection-demo";
import { currency } from "@/lib/format";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/strategiques")({
  head: () => ({ meta: [{ title: "Clients stratégiques — Prospection" }] }),
  component: StrategicPage,
});

function StrategicPage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const list = companies.filter((c) => c.kind === "client" && c.strategic);
  const [planFor, setPlanFor] = useState<Company | null>(null);
  const [oppFor, setOppFor] = useState<string | null>(null);
  const [actFor, setActFor] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Clients stratégiques"
        subtitle="Ouvrez la fiche ou éditez le plan de compte."
        actions={
          <button type="button" className={CRM_PRIMARY_BTN} onClick={() => setCreateOpen(true)}>
            Nouvelle opportunité
          </button>
        }
      />
      <CrmCardGrid dense>
        {list.map((c, i) => (
          <CrmCard key={c.id} index={i} className="h-full">
            <div className="flex items-start gap-3">
              <EntityMark name={c.name} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link
                    to="/prospection/clients/$id"
                    params={{ id: c.id }}
                    className="font-display text-base font-semibold hover:text-primary"
                  >
                    {c.name}
                  </Link>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                    <Star className="h-3 w-3 fill-current" />
                    Stratégique
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{managerName(c.managerId)}</p>
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
                value={c.plan ? currency(c.plan.feePotential) : "—"}
                hint={c.plan ? "Plan rédigé" : "Plan à rédiger"}
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {c.plan?.stakes ?? "Plan de compte à rédiger."}
            </p>
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
                Enregistrer un contact
              </button>
            </div>
          </CrmCard>
        ))}
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
        defaultKind="appel"
      />
    </div>
  );
}
