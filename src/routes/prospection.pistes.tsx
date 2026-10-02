import { createFileRoute, useNavigate, useRouteContext } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LeadBadge, LineBadge } from "@/components/prospection/ProspectionBadges";
import { NewLeadDialog } from "@/components/prospection/CrmForms";
import { CrmCard, CrmCardGrid, EntityMark, MetricTile } from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN } from "@/components/prospection/CrmUi";
import { LEAD_STATUS_LABELS, managerName, type LeadStatus } from "@/lib/prospection-demo";
import { canManagePipeline, crmRoleFromStaff } from "@/lib/prospection-access";
import { shortDate } from "@/lib/format";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/pistes")({
  head: () => ({ meta: [{ title: "Pistes internes — Prospection" }] }),
  component: LeadsPage,
});

const MANAGER_STATUSES: LeadStatus[] = ["en_cours", "qualifiee", "rejetee", "reportee"];

function LeadsPage() {
  const { session } = useRouteContext({ from: "/prospection" });
  const crm = crmRoleFromStaff(session.staff.role);
  const canQualify = canManagePipeline(crm);
  const leads = useProspectionDemoStore((s) => s.leads);
  const setLeadStatus = useProspectionDemoStore((s) => s.setLeadStatus);
  const convertLead = useProspectionDemoStore((s) => s.convertLead);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Pistes internes"
        subtitle={
          canQualify
            ? "Collaborateur : signaler. Manager : qualifier puis convertir en Qualification."
            : "Signalez un besoin client en moins d’une minute. Le manager qualifiera."
        }
        actions={
          <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
            <Plus className="h-4 w-4" />
            Signaler une piste
          </button>
        }
      />

      <CrmCardGrid dense>
        {leads.map((l, i) => (
          <CrmCard key={l.id} index={i} className="h-full">
            <div className="flex items-start gap-3">
              <EntityMark name={l.companyName} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-display text-base font-semibold leading-tight">{l.companyName}</h2>
                  <LeadBadge status={l.status} />
                </div>
                <p className="mt-1 text-sm font-medium">{l.need}</p>
                {l.comment ? <p className="mt-1 text-sm text-muted-foreground">{l.comment}</p> : null}
                <div className="mt-2">
                  <LineBadge line={l.line} />
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MetricTile label="Signalée le" value={shortDate(l.at)} hint={l.author} />
              <MetricTile label="Manager" value={managerName(l.ownerId)} />
            </div>
            {canQualify && l.status !== "convertie" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {MANAGER_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setLeadStatus(l.id, st);
                      toast.success(`Statut : ${LEAD_STATUS_LABELS[st]}`);
                    }}
                    className={CRM_SECONDARY_BTN + " !px-3 !py-1.5 !text-xs"}
                  >
                    {LEAD_STATUS_LABELS[st]}
                  </button>
                ))}
                <button
                  type="button"
                  className={CRM_PRIMARY_BTN + " !px-3 !py-1.5 !text-xs"}
                  onClick={() => {
                    convertLead(l.id);
                    toast.success("Convertie en opportunité (Qualification)");
                    void navigate({ to: "/prospection/opportunites" });
                  }}
                >
                  Convertir
                </button>
              </div>
            ) : null}
          </CrmCard>
        ))}
      </CrmCardGrid>

      <NewLeadDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
