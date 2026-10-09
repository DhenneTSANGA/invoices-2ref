import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
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
  ACTIVE_STAGES,
  ACTIVITY_LABELS,
  SERVICE_LINE_LABELS,
  SERVICE_LINES,
  SITE_LABELS,
  SOURCE_LABELS,
  managerName,
  type Activity,
  type ActivityKind,
  type Contact,
  type Lead,
  type Opportunity,
  type ServiceLine,
} from "@/lib/prospection-demo";
import { currency, shortDate } from "@/lib/format";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import {
  prospectionClientsKey,
  useProspectionCompanies,
} from "@/hooks/use-prospection-companies";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prospection/prospects/$id")({
  component: ProspectDetailPage,
});

const QUICK_KINDS: { kind: ActivityKind; label: string }[] = [
  { kind: "appel", label: "Appel" },
  { kind: "email", label: "E-mail" },
  { kind: "visite", label: "Visite" },
  { kind: "rdv", label: "Rendez-vous" },
  { kind: "evenement", label: "Événement" },
];

function ProspectDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { companies } = useProspectionCompanies();
  const contacts = useProspectionDemoStore((s) => s.contacts);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const activities = useProspectionDemoStore((s) => s.activities);
  const leads = useProspectionDemoStore((s) => s.leads);
  const convertProspect = useProspectionDemoStore((s) => s.convertProspect);
  const deleteCompany = useProspectionDemoStore((s) => s.deleteCompany);
  const deleteContact = useProspectionDemoStore((s) => s.deleteContact);
  const deleteOpportunity = useProspectionDemoStore((s) => s.deleteOpportunity);
  const deleteActivity = useProspectionDemoStore((s) => s.deleteActivity);
  const deleteLead = useProspectionDemoStore((s) => s.deleteLead);
  const company = companies.find((c) => c.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [oppOpen, setOppOpen] = useState(false);
  const [oppLine, setOppLine] = useState<ServiceLine | undefined>();
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityKind, setActivityKind] = useState<ActivityKind | undefined>();
  const [planOpen, setPlanOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);

  if (!company) {
    return (
      <p>
        Introuvable. <Link to="/prospection/prospects">Retour</Link>
      </p>
    );
  }

  const people = contacts.filter((c) => c.companyId === id);
  const deals = opportunities.filter((o) => o.companyId === id);
  const openDeals = deals.filter((o) => ACTIVE_STAGES.includes(o.stage));
  const journal = activities
    .filter((a) => a.companyId === id)
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at));
  const companyLeads = leads.filter((l) => l.companyId === id || l.companyName === company.name);
  const nextDeal = deals
    .filter((o) => o.nextAction)
    .sort((a, b) => a.nextActionOn.localeCompare(b.nextActionOn))[0];
  const hasDecisionMaker = people.some((c) => c.decisionMaker);
  const potential = openDeals.reduce((sum, o) => sum + o.amount, 0);
  const ready = hasDecisionMaker && journal.length > 0 && openDeals.length > 0 && Boolean(nextDeal);

  const openDeal = (line?: ServiceLine) => {
    setOppLine(line);
    setOppOpen(true);
  };
  const openActivity = (kind?: ActivityKind) => {
    setActivityKind(kind);
    setActivityOpen(true);
  };
  const convert = () => {
    void (async () => {
      try {
        const converted = await convertProspect(id);
        void qc.invalidateQueries({ queryKey: prospectionClientsKey });
        toast.success("Client créé dans Facturation");
        void navigate({
          to: "/prospection/clients/$id",
          params: { id: converted.id },
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Conversion impossible");
      }
    })();
  };

  const steps = [
    {
      ok: hasDecisionMaker,
      title: "Identifier un décideur",
      hint: hasDecisionMaker ? "Un contact décideur est sur la fiche." : "Nom, fonction, téléphone.",
      action: "Ajouter un contact",
      onClick: () => setContactOpen(true),
    },
    {
      ok: journal.length > 0,
      title: "Tracer un échange",
      hint: journal.length > 0 ? `${journal.length} activité(s) au journal.` : "Appel, e-mail, visite ou rendez-vous.",
      action: "Enregistrer",
      onClick: () => openActivity(),
    },
    {
      ok: openDeals.length > 0,
      title: "Ouvrir une affaire",
      hint: openDeals.length > 0 ? `${openDeals.length} opportunité(s) ouverte(s).` : "Choisir une ligne et un montant.",
      action: "Créer",
      onClick: () => openDeal(),
    },
    {
      ok: Boolean(nextDeal),
      title: "Poser la prochaine action",
      hint: nextDeal ? `${nextDeal.nextAction} · ${shortDate(nextDeal.nextActionOn)}` : "Date et suite concrète.",
      action: "La noter",
      onClick: () => openActivity(),
    },
  ];

  return (
    <div>
      <Link to="/prospection/prospects" className="mb-4 inline-block text-sm text-primary hover:underline">
        Tous les prospects
      </Link>
      <PageHeader
        title={company.name}
        subtitle={`${SITE_LABELS[company.site]} · ${company.sector} · ${managerName(company.managerId)}`}
        actions={
          <>
            <button type="button" className={CRM_PRIMARY_BTN} onClick={convert}>
              Convertir en client
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => openDeal()}>
              Opportunité
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => openActivity()}>
              Activité
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setContactOpen(true)}>
              Contact
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setLeadOpen(true)}>
              Piste
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setPlanOpen(true)}>
              Qualification
            </button>
            <button type="button" className={CRM_SECONDARY_BTN} onClick={() => setEditOpen(true)}>
              Modifier
            </button>
            <button
              type="button"
              className={CRM_SECONDARY_BTN + " text-danger hover:bg-danger/10"}
              onClick={() => {
                if (!confirm(`Supprimer la fiche « ${company.name} » et les données CRM liées ?`)) return;
                void deleteCompany(id).then(
                  () => {
                    toast.success("Prospect supprimé");
                    void navigate({ to: "/prospection/prospects" });
                  },
                  (err) => toast.error(err instanceof Error ? err.message : "Suppression impossible"),
                );
              }}
            >
              Supprimer
            </button>
          </>
        }
      />

      <CrmCard className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold">Qualification</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {ready
                ? "Les quatre points sont remplis. La conversion en client peut suivre."
                : "Quatre actions avant de convertir : décideur, échange, affaire, prochaine action."}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              ready ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-800 dark:text-amber-300",
            )}
          >
            {steps.filter((s) => s.ok).length} / {steps.length}
          </span>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {steps.map((step) => (
            <li key={step.title} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/45 px-3 py-2.5">
              <div className="flex min-w-0 items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    step.ok ? "bg-emerald-500 text-white" : "border border-border bg-background",
                  )}
                >
                  {step.ok ? <Check className="h-3 w-3" /> : null}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{step.title}</div>
                  <p className="text-xs text-muted-foreground">{step.hint}</p>
                </div>
              </div>
              {step.ok ? null : (
                <button type="button" className="shrink-0 text-xs font-semibold text-primary hover:underline" onClick={step.onClick}>
                  {step.action}
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_KINDS.map((item) => (
            <button key={item.kind} type="button" className={CRM_SECONDARY_BTN} onClick={() => openActivity(item.kind)}>
              {item.label}
            </button>
          ))}
        </div>
      </CrmCard>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <CrmCard>
          <div className="flex items-start gap-3">
            <EntityMark name={company.name} />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-semibold">Informations</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {company.sector} · {company.size || "Taille à préciser"}
              </p>
            </div>
            <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setEditOpen(true)}>
              Modifier
            </button>
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
          {company.notes ? <p className="mt-3 text-sm leading-relaxed">{company.notes}</p> : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MetricTile label="Source" value={SOURCE_LABELS[company.source]} />
            <MetricTile label="Potentiel ouvert" value={currency(potential)} accent />
          </div>
          {nextDeal ? <NextActionRow action={nextDeal.nextAction} date={nextDeal.nextActionOn} /> : null}
          {company.targetLines.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {company.targetLines.map((l) => (
                <LineBadge key={l} line={l} />
              ))}
            </div>
          ) : null}
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
            <button
              type="button"
              className="mt-4 w-full rounded-2xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary"
              onClick={() => setContactOpen(true)}
            >
              Aucun contact. Ajoutez le décideur (DAF, DG, DRH).
            </button>
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
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-danger"
                    onClick={() => {
                      if (!confirm(`Supprimer ${c.firstName} ${c.lastName} ?`)) return;
                      void deleteContact(c.id).then(
                        () => toast.success("Contact supprimé"),
                        (err) =>
                          toast.error(err instanceof Error ? err.message : "Suppression impossible"),
                      );
                    }}
                  >
                    Suppr.
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CrmCard>
      </div>

      <CrmCard className="mb-5">
        <h2 className="font-display text-base font-semibold">Lignes à proposer</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Chaque bouton ouvre une opportunité en Qualification, avec montant et prochaine action.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {SERVICE_LINES.map((l) => {
            const targeted = company.targetLines.includes(l);
            const opened = openDeals.some((o) => o.line === l);
            return (
              <li key={l} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/45 px-3 py-2.5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <LineBadge line={l} />
                  {targeted ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Visée</span>
                  ) : null}
                </div>
                {opened ? (
                  <span className="inline-flex rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-800 dark:text-sky-300">
                    Affaire ouverte
                  </span>
                ) : (
                  <ProposeLineButton lineLabel={SERVICE_LINE_LABELS[l]} onClick={() => openDeal(l)} />
                )}
              </li>
            );
          })}
        </ul>
      </CrmCard>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <CrmCard>
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display text-base font-semibold">Opportunités</h2>
            <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => openDeal()}>
              Nouvelle
            </button>
          </div>
          {deals.length === 0 ? (
            <button
              type="button"
              className="mt-4 w-full rounded-2xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary"
              onClick={() => openDeal(company.targetLines[0])}
            >
              Aucune affaire. Créez-en une sur la ligne visée.
            </button>
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
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-danger"
                        onClick={() => {
                          if (!confirm("Supprimer cette opportunité ?")) return;
                          void deleteOpportunity(o.id).then(
                            () => toast.success("Opportunité supprimée"),
                            (err) =>
                              toast.error(
                                err instanceof Error ? err.message : "Suppression impossible",
                              ),
                          );
                        }}
                      >
                        Suppr.
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
            <h2 className="font-display text-base font-semibold">Journal</h2>
            <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => openActivity()}>
              Noter
            </button>
          </div>
          {journal.length === 0 ? (
            <button
              type="button"
              className="mt-4 w-full rounded-2xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary"
              onClick={() => openActivity("appel")}
            >
              Aucun échange. Notez le premier appel.
            </button>
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
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-danger"
                          onClick={() => {
                            if (!confirm("Supprimer cette activité ?")) return;
                            void deleteActivity(a.id).then(
                              () => toast.success("Activité supprimée"),
                              (err) =>
                                toast.error(
                                  err instanceof Error ? err.message : "Suppression impossible",
                                ),
                            );
                          }}
                        >
                          Suppr.
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
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pistes internes</p>
              <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setLeadOpen(true)}>
                Signaler
              </button>
            </div>
            {companyLeads.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Aucune piste rattachée à cette entreprise.</p>
            ) : (
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
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-danger"
                        onClick={() => {
                          if (!confirm("Supprimer cette piste ?")) return;
                          void deleteLead(l.id).then(
                            () => toast.success("Piste supprimée"),
                            (err) =>
                              toast.error(
                                err instanceof Error ? err.message : "Suppression impossible",
                              ),
                          );
                        }}
                      >
                        Suppr.
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CrmCard>
      </div>

      <CrmCard>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <IconMark icon={FileText} tone="bg-violet-500/15 text-violet-700 dark:text-violet-300" />
            <div>
              <h2 className="font-display text-base font-semibold">Dossier de qualification</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Enjeux, décideurs, besoins et potentiel d’honoraires.</p>
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
            <PlanField label="Besoins détectés" value={company.plan.detectedNeeds} />
            <PlanField label="Risques" value={company.plan.risks} />
            <PlanField label="Potentiel" value={currency(company.plan.feePotential)} />
            <div className="sm:col-span-2">
              <PlanField label="Suite" value={company.plan.nextMoves} />
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="mt-4 w-full rounded-2xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary"
            onClick={() => setPlanOpen(true)}
          >
            Pas encore de dossier. Notez les enjeux et le potentiel.
          </button>
        )}
      </CrmCard>

      <CompanyDialog open={editOpen} onOpenChange={setEditOpen} kind="prospect" editing={company} />
      <NewContactDialog open={contactOpen} onOpenChange={setContactOpen} companyId={id} />
      <NewOpportunityDialog
        open={oppOpen}
        onOpenChange={(v) => {
          setOppOpen(v);
          if (!v) setOppLine(undefined);
        }}
        defaultCompanyId={id}
        defaultLine={oppLine}
        defaultSource="nouveau"
      />
      <NewActivityDialog
        open={activityOpen}
        onOpenChange={(v) => {
          setActivityOpen(v);
          if (!v) setActivityKind(undefined);
        }}
        defaultCompanyId={id}
        defaultKind={activityKind}
      />
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
      <p className="mt-1 text-sm leading-relaxed">{value || "—"}</p>
    </div>
  );
}
