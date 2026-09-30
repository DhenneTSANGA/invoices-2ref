import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import {
  SERVICE_LINE_LABELS,
  SITE_LABELS,
  managerName,
  missingServices,
} from "@/lib/prospection-demo";
import { currency, shortDate } from "@/lib/format";
import { LineBadge, StageBadge } from "@/components/prospection/ProspectionBadges";

export const Route = createFileRoute("/prospection/clients/$id")({
  component: CrmClientDetailPage,
});

const TABS = ["Informations", "Contacts", "Services", "Opportunités", "Activités", "Plan de compte"] as const;

function CrmClientDetailPage() {
  const { id } = Route.useParams();
  const companies = useProspectionDemoStore((s) => s.companies);
  const contacts = useProspectionDemoStore((s) => s.contacts);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const activities = useProspectionDemoStore((s) => s.activities);
  const leads = useProspectionDemoStore((s) => s.leads);
  const addOpportunity = useProspectionDemoStore((s) => s.addOpportunity);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Informations");
  const company = companies.find((c) => c.id === id);

  if (!company) {
    return (
      <p>
        Introuvable. <Link to="/prospection/clients">Retour</Link>
      </p>
    );
  }

  const missing = missingServices(company);

  return (
    <div>
      <Link to="/prospection/clients" className="mb-4 inline-block text-sm text-primary hover:underline">
        Tous les clients
      </Link>
      <PageHeader
        title={company.name}
        subtitle={`${SITE_LABELS[company.site]} · ${managerName(company.managerId)} · CA ${currency(company.caSigned)}`}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-2xl px-3 py-1.5 text-sm ${tab === t ? "bg-gradient-primary text-primary-foreground" : "border border-border"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Informations" && (
        <section className="glass-panel rounded-3xl p-5 text-sm">
          <p>{company.sector} · {company.size}</p>
          <p className="mt-2 text-muted-foreground">{company.address} · {company.email}</p>
          {company.strategic ? <p className="mt-2 font-medium">Client stratégique</p> : null}
        </section>
      )}
      {tab === "Contacts" && (
        <ul className="glass-panel space-y-2 rounded-3xl p-5 text-sm">
          {contacts.filter((c) => c.companyId === id).map((c) => (
            <li key={c.id}>
              {c.firstName} {c.lastName} — {c.role} {c.decisionMaker ? "(décideur)" : ""} · {c.email}
            </li>
          ))}
        </ul>
      )}
      {tab === "Services" && (
        <section className="glass-panel rounded-3xl p-5">
          <p className="text-sm font-medium">Acheté</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {company.servicesBought.map((l) => (
              <LineBadge key={l} line={l} />
            ))}
          </div>
          <p className="mt-4 text-sm font-medium">À proposer (vente croisée)</p>
          <div className="mt-2 space-y-2">
            {missing.map((l) => (
              <div key={l} className="flex items-center justify-between gap-2 text-sm">
                <span>{SERVICE_LINE_LABELS[l]}</span>
                <button
                  type="button"
                  className="rounded-xl border border-border px-3 py-1"
                  onClick={() => {
                    addOpportunity({
                      companyId: id,
                      title: `Cross-sell ${SERVICE_LINE_LABELS[l]}`,
                      line: l,
                      source: "client_existant",
                      stage: "qualification",
                      amount: 0,
                      probability: 20,
                      decisionOn: new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10),
                      nextAction: "Qualifier le besoin",
                      nextActionOn: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
                      ownerId: company.managerId,
                      notes: "Créé depuis la matrice client × services.",
                    });
                    toast.success("Opportunité créée à Qualification");
                  }}
                >
                  Créer une opportunité
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === "Opportunités" && (
        <ul className="space-y-2">
          {opportunities.filter((o) => o.companyId === id).map((o) => (
            <li key={o.id} className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3 text-sm">
              <span>{o.title} · {currency(o.amount)}</span>
              <StageBadge stage={o.stage} />
            </li>
          ))}
        </ul>
      )}
      {tab === "Activités" && (
        <ul className="glass-panel space-y-2 rounded-3xl p-5 text-sm text-muted-foreground">
          {activities.filter((a) => a.companyId === id).map((a) => (
            <li key={a.id}>{shortDate(a.at)} — {a.title} · {a.summary}</li>
          ))}
          <li className="pt-2 text-foreground">Pistes : {leads.filter((l) => l.companyId === id).length}</li>
        </ul>
      )}
      {tab === "Plan de compte" && (
        <section className="glass-panel rounded-3xl p-5 text-sm leading-relaxed">
          {company.plan ? (
            <>
              <p><strong>Enjeux.</strong> {company.plan.stakes}</p>
              <p className="mt-2"><strong>Objectifs.</strong> {company.plan.objectives}</p>
              <p className="mt-2"><strong>Décideurs.</strong> {company.plan.decisionMakers}</p>
              <p className="mt-2"><strong>Influenceurs.</strong> {company.plan.influencers}</p>
              <p className="mt-2"><strong>Besoins.</strong> {company.plan.detectedNeeds}</p>
              <p className="mt-2"><strong>Risques.</strong> {company.plan.risks}</p>
              <p className="mt-2"><strong>Potentiel.</strong> {currency(company.plan.feePotential)}</p>
              <p className="mt-2"><strong>Suite.</strong> {company.plan.nextMoves}</p>
              <p className="mt-2"><strong>Stratégie.</strong> {company.plan.strategy}</p>
            </>
          ) : (
            <p className="text-muted-foreground">Pas de plan de compte — réservé aux clients stratégiques.</p>
          )}
        </section>
      )}
    </div>
  );
}
