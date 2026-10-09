import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  Star,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import {
  ActivityStatusBadge,
  LeadBadge,
  LineBadge,
  StageBadge,
} from "@/components/prospection/ProspectionBadges";
import {
  AccountPlanDialog,
  CompanyDialog,
  NewActivityDialog,
  NewContactDialog,
  NewLeadDialog,
  NewOpportunityDialog,
} from "@/components/prospection/CrmForms";
import {
  CrmCard,
  EntityMark,
  IconMark,
  KindMark,
  MetricTile,
  NextActionRow,
} from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN, ProposeLineButton } from "@/components/prospection/CrmUi";
import {
  ACTIVITY_LABELS,
  SERVICE_LINE_LABELS,
  SERVICE_LINES,
  SITE_LABELS,
  SOURCE_LABELS,
  managerName,
  type Activity,
  type Contact,
  type Lead,
  type Opportunity,
  type ServiceLine,
} from "@/lib/prospection-demo";
import { currency, shortDate } from "@/lib/format";
import { readFocusSearch, useSpotlight } from "@/hooks/use-spotlight";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { useProspectionCompanies } from "@/hooks/use-prospection-companies";

export const Route = createFileRoute("/prospection/clients/$id")({
  validateSearch: readFocusSearch,
  component: CrmClientDetailPage,
});

function CrmClientDetailPage() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const { focus } = Route.useSearch();
  useSpotlight(focus, () => {
    void navigate({
      to: "/prospection/clients/$id",
      params: { id },
      search: { focus: undefined },
      replace: true,
      resetScroll: false,
    });
  });
  const { companies } = useProspectionCompanies();
  const contacts = useProspectionDemoStore((s) => s.contacts);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const activities = useProspectionDemoStore((s) => s.activities);
  const leads = useProspectionDemoStore((s) => s.leads);
  const updateCompany = useProspectionDemoStore((s) => s.updateCompany);
  const [editOpen, setEditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [oppOpen, setOppOpen] = useState(false);
  const [oppLine, setOppLine] = useState<ServiceLine | undefined>();
  const [activityOpen, setActivityOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const company = companies.find((c) => c.id === id);

  if (!company) {
    return (
      <p>
        Introuvable. <Link to="/prospection/clients">Retour</Link>
      </p>
    );
  }

  const people = contacts.filter((c) => c.companyId === id);
  const deals = opportunities.filter((o) => o.companyId === id);
  const journal = activities
    .filter((a) => a.companyId === id)
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at));
  const companyLeads = leads.filter((l) => l.companyId === id || l.companyName === company.name);
  const nextDeal = deals
    .filter((o) => o.nextAction)
    .sort((a, b) => a.nextActionOn.localeCompare(b.nextActionOn))[0];
  const openDeal = (line: ServiceLine) => {
    setOppLine(line);
    setOppOpen(true);
  };

  return (
    <div>
      <Link to="/prospection/clients" className="mb-4 inline-block text-sm text-primary hover:underline">
        Tous les clients
      </Link>
      {company.fromFacturation ? (
        <p className="mb-3 rounded-2xl border border-sky-200/80 bg-sky-50 px-3 py-2 text-xs text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-100">
          Fiche client Facturation
          {company.cabinet === "conseil"
            ? " (2R Conseil)"
            : company.cabinet === "expertise_fiscale"
              ? " (2R Expertise)"
              : ""}
          {" "}
          — lecture seule. Les notes CRM / plan de compte / statut stratégique restent dans
          Prospection et ne modifient pas Facturation.
        </p>
      ) : null}
      <PageHeader
        title={company.name}
        subtitle={`${SITE_LABELS[company.site]} · ${managerName(company.managerId)} · CA ${currency(company.caSigned)}`}
        actions={
          <>
            <button type="button" className={CRM_PRIMARY_BTN} onClick={() => setOppOpen(true)}>
              Nouvelle opportunité
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setActivityOpen(true)}>
              Activité
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setContactOpen(true)}>
              Contact
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setPlanOpen(true)}>
              Plan de compte
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setLeadOpen(true)}>
              Piste
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setEditOpen(true)}>
              Modifier
            </button>
            <button
              type="button"
              className={CRM_SECONDARY_BTN}
              onClick={() => {
                void (async () => {
                  try {
                    await updateCompany(id, { strategic: !company.strategic });
                    toast.success(company.strategic ? "Retiré des stratégiques" : "Marqué stratégique");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
                  }
                })();
              }}
            >
              {company.strategic ? "Retirer stratégique" : "Marquer stratégique"}
            </button>
          </>
        }
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <CrmCard spotId={company.id} spotlight={focus === company.id}>
          <div className="flex items-start gap-3">
            <EntityMark name={company.name} />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-semibold">Informations</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {company.sector} · {company.size}
              </p>
              {company.strategic ? (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <Star className="h-3 w-3" />
                  Client stratégique
                </span>
              ) : null}
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              {company.address || SITE_LABELS[company.site]}
            </li>
            {company.phone ? (
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                {company.phone}
              </li>
            ) : null}
            {company.email ? (
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                {company.email}
              </li>
            ) : null}
            {company.website ? (
              <li className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4 shrink-0" />
                {company.website}
              </li>
            ) : null}
            <li className="flex items-center gap-2 text-muted-foreground">
              <UserRound className="h-4 w-4 shrink-0" />
              Manager {managerName(company.managerId)}
            </li>
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MetricTile label="Source" value={SOURCE_LABELS[company.source]} />
            <MetricTile label="CA signé" value={currency(company.caSigned)} accent />
          </div>
          {nextDeal ? <NextActionRow action={nextDeal.nextAction} date={nextDeal.nextActionOn} /> : null}
        </CrmCard>

        <CrmCard>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <IconMark icon={UserRound} tone="bg-sky-500/15 text-sky-800 dark:text-sky-300" />
              <div>
                <h2 className="font-display text-base font-semibold">Contacts</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{people.length} personne(s)</p>
              </div>
            </div>
            <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setContactOpen(true)}>
              Ajouter
            </button>
          </div>
          {people.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Aucun contact — ajoutez un décideur.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {people.map((c) => (
                <li key={c.id} className="flex items-start gap-3 rounded-2xl bg-muted/45 px-3 py-2.5">
                  <EntityMark name={`${c.firstName} ${c.lastName}`} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {c.firstName} {c.lastName}
                      </span>
                      {c.decisionMaker ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                          Décideur
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.role} · influence {c.influence}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.email}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-primary"
                    onClick={() => setEditContact(c)}
                  >
                    Modif.
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CrmCard>
      </div>

      <CrmCard className="mb-5">
          <h2 className="font-display text-base font-semibold">Lignes de service</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Acheté = déjà au contrat. <strong>À proposer</strong> ouvre une opportunité de vente croisée.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {SERVICE_LINES.map((l) => {
            const bought = company.servicesBought.includes(l);
            return (
              <li
                key={l}
                className="flex items-center justify-between gap-3 rounded-2xl bg-muted/45 px-3 py-2.5"
              >
                <LineBadge line={l} />
                {bought ? (
                  <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Acheté
                  </span>
                ) : (
                  <ProposeLineButton lineLabel={SERVICE_LINE_LABELS[l]} onClick={() => openDeal(l)} />
                )}
              </li>
            );
          })}
        </ul>
      </CrmCard>

      <CrmCard className="mb-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <IconMark icon={FileText} tone="bg-violet-500/15 text-violet-700 dark:text-violet-300" />
            <div>
              <h2 className="font-display text-base font-semibold">Plan de compte</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Enjeux, décideurs, potentiel d’honoraires (cahier : clients à fort potentiel)
              </p>
            </div>
          </div>
          <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setPlanOpen(true)}>
            {company.plan ? "Modifier" : "Rédiger"}
          </button>
        </div>
        {company.plan ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <PlanField label="Enjeux" value={company.plan.stakes} />
            <PlanField label="Objectifs" value={company.plan.objectives} />
            <PlanField label="Décideurs" value={company.plan.decisionMakers} />
            <PlanField label="Influenceurs" value={company.plan.influencers} />
            <PlanField label="Besoins détectés" value={company.plan.detectedNeeds} />
            <PlanField label="Risques" value={company.plan.risks} />
            <PlanField label="Potentiel" value={currency(company.plan.feePotential)} />
            <PlanField label="Suite" value={company.plan.nextMoves} />
            <div className="sm:col-span-2">
              <PlanField label="Stratégie" value={company.plan.strategy} />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Pas encore de plan — utilisez Rédiger.</p>
        )}
      </CrmCard>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <CrmCard>
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display text-base font-semibold">Opportunités</h2>
            <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setOppOpen(true)}>
              Nouvelle
            </button>
          </div>
          {deals.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Aucune affaire ouverte.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {deals.map((o) => (
                <li key={o.id} className="rounded-2xl bg-muted/45 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{o.title}</span>
                    <div className="flex items-center gap-2">
                      <StageBadge stage={o.stage} />
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-primary"
                        onClick={() => setEditOpp(o)}
                      >
                        Modif.
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <LineBadge line={o.line} />
                    <span className="text-xs font-medium text-primary">{currency(o.amount)}</span>
                  </div>
                  <NextActionRow action={o.nextAction} date={o.nextActionOn} />
                </li>
              ))}
            </ul>
          )}
        </CrmCard>

        <CrmCard>
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display text-base font-semibold">Activités</h2>
            <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setActivityOpen(true)}>
              Noter
            </button>
          </div>
          {journal.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Aucun échange tracé.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {journal.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-2xl bg-muted/45 px-3 py-2.5">
                  <KindMark kind={a.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{a.title}</span>
                      <div className="flex items-center gap-2">
                        <ActivityStatusBadge status={a.status} />
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-primary"
                          onClick={() => setEditActivity(a)}
                        >
                          Modif.
                        </button>
                      </div>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ACTIVITY_LABELS[a.kind]} · {shortDate(a.at)}
                      {a.time ? ` · ${a.time}` : ""}
                    </p>
                    {a.summary ? <p className="mt-1 text-sm">{a.summary}</p> : null}
                    {a.nextAction ? <NextActionRow action={a.nextAction} date={a.nextActionOn} /> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {companyLeads.length > 0 ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pistes internes</p>
              <ul className="mt-2 space-y-2">
                {companyLeads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 rounded-2xl bg-muted/45 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{l.need}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <LeadBadge status={l.status} />
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-primary"
                        onClick={() => setEditLead(l)}
                      >
                        Modif.
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CrmCard>
      </div>

      <CompanyDialog open={editOpen} onOpenChange={setEditOpen} kind="client" editing={company} />
      <NewContactDialog open={contactOpen} onOpenChange={setContactOpen} companyId={id} />
      <NewOpportunityDialog
        open={oppOpen}
        onOpenChange={(v) => {
          setOppOpen(v);
          if (!v) setOppLine(undefined);
        }}
        defaultCompanyId={id}
        defaultLine={oppLine}
      />
      <NewActivityDialog open={activityOpen} onOpenChange={setActivityOpen} defaultCompanyId={id} />
      <AccountPlanDialog open={planOpen} onOpenChange={setPlanOpen} company={company} />
      <NewLeadDialog open={leadOpen} onOpenChange={setLeadOpen} defaultCompanyName={company.name} />
      <NewContactDialog
        open={Boolean(editContact)}
        onOpenChange={(v) => {
          if (!v) setEditContact(null);
        }}
        companyId={id}
        editing={editContact}
      />
      <NewOpportunityDialog
        open={Boolean(editOpp)}
        onOpenChange={(v) => {
          if (!v) setEditOpp(null);
        }}
        editing={editOpp}
      />
      <NewActivityDialog
        open={Boolean(editActivity)}
        onOpenChange={(v) => {
          if (!v) setEditActivity(null);
        }}
        editing={editActivity}
      />
      <NewLeadDialog
        open={Boolean(editLead)}
        onOpenChange={(v) => {
          if (!v) setEditLead(null);
        }}
        editing={editLead}
      />
    </div>
  );
}

function PlanField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/45 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <p className="mt-1 text-sm leading-relaxed">{value}</p>
    </div>
  );
}
