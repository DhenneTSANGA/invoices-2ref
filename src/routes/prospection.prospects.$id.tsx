import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LineBadge, StageBadge } from "@/components/prospection/ProspectionBadges";
import {
  CompanyDialog,
  NewActivityDialog,
  NewContactDialog,
  NewOpportunityDialog,
} from "@/components/prospection/CrmForms";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN } from "@/components/prospection/CrmUi";
import { SITE_LABELS, managerName } from "@/lib/prospection-demo";
import { shortDate } from "@/lib/format";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/prospects/$id")({
  component: ProspectDetailPage,
});

function ProspectDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const companies = useProspectionDemoStore((s) => s.companies);
  const contacts = useProspectionDemoStore((s) => s.contacts);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const activities = useProspectionDemoStore((s) => s.activities);
  const convertProspect = useProspectionDemoStore((s) => s.convertProspect);
  const company = companies.find((c) => c.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [oppOpen, setOppOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  if (!company) {
    return (
      <p>
        Introuvable. <Link to="/prospection/prospects">Retour</Link>
      </p>
    );
  }

  return (
    <div>
      <Link to="/prospection/prospects" className="mb-4 inline-block text-sm text-primary hover:underline">
        Tous les prospects
      </Link>
      <PageHeader
        title={company.name}
        subtitle={`${SITE_LABELS[company.site]} · ${managerName(company.managerId)}`}
        actions={
          <>
            <button
              type="button"
              className={CRM_PRIMARY_BTN}
              onClick={() => {
                convertProspect(id);
                toast.success("Converti en client");
                void navigate({ to: "/prospection/clients/$id", params: { id } });
              }}
            >
              Convertir en client
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setOppOpen(true)}>
              Créer une opportunité
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setActivityOpen(true)}>
              Enregistrer un appel
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setContactOpen(true)}>
              Ajouter un contact
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setEditOpen(true)}>
              Modifier
            </button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-panel rounded-3xl p-5">
          <h3 className="font-display font-semibold">Contacts</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {contacts
              .filter((c) => c.companyId === id)
              .map((c) => (
                <li key={c.id}>
                  {c.firstName} {c.lastName} — {c.role}
                  {c.decisionMaker ? " · décideur" : ""}
                </li>
              ))}
          </ul>
        </section>
        <section className="glass-panel rounded-3xl p-5">
          <h3 className="font-display font-semibold">Opportunités</h3>
          <ul className="mt-3 space-y-2">
            {opportunities
              .filter((o) => o.companyId === id)
              .map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{o.title}</span>
                  <StageBadge stage={o.stage} />
                </li>
              ))}
          </ul>
        </section>
      </div>
      <section className="glass-panel mt-4 rounded-3xl p-5">
        <h3 className="font-display font-semibold">Journal</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {activities
            .filter((a) => a.companyId === id)
            .slice(0, 12)
            .map((a) => (
              <li key={a.id}>
                {shortDate(a.at)} — {a.title} · {a.summary}
              </li>
            ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-1">
          {company.targetLines.map((l) => (
            <LineBadge key={l} line={l} />
          ))}
        </div>
      </section>
      <CompanyDialog open={editOpen} onOpenChange={setEditOpen} kind="prospect" editing={company} />
      <NewContactDialog open={contactOpen} onOpenChange={setContactOpen} companyId={id} />
      <NewOpportunityDialog open={oppOpen} onOpenChange={setOppOpen} defaultCompanyId={id} />
      <NewActivityDialog
        open={activityOpen}
        onOpenChange={setActivityOpen}
        defaultCompanyId={id}
        defaultKind="appel"
      />
    </div>
  );
}
