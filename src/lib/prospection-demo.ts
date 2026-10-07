export type ServiceLine =
  | "rh"
  | "comptabilite"
  | "conseil"
  | "fiscalite"
  | "formation";

export type Site = "libreville" | "port_gentil" | "franceville";

export type CompanyKind = "prospect" | "client";

export type OpportunitySource =
  | "nouveau"
  | "client_existant"
  | "client_formation"
  | "piste_interne";

export type PipelineStage =
  | "qualification"
  | "premier_contact"
  | "rendez_vous"
  | "proposition"
  | "negotiation"
  | "decision"
  | "gagne"
  | "perdu"
  | "reporte";

/** Types d’action du CDC : appels, e-mails, visites, rendez-vous, événements. */
export type ActivityKind =
  | "appel"
  | "email"
  | "visite"
  | "rdv"
  | "evenement";

export type ActivityStatus =
  | "a_faire"
  | "planifiee"
  | "en_cours"
  | "terminee"
  | "annulee"
  | "en_retard";

export type LeadStatus =
  | "nouvelle"
  | "en_cours"
  | "qualifiee"
  | "convertie"
  | "rejetee"
  | "reportee";

export type ExpenseCategory =
  | "evenements"
  | "relations"
  | "communication"
  | "deplacements"
  | "reserve";

export type ExpenseApproval = "none" | "pending" | "approved" | "rejected";

export type Manager = {
  id: string;
  name: string;
  lines: ServiceLine[];
};

export type Contact = {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string;
  email: string;
  decisionMaker: boolean;
  influence: "faible" | "moyen" | "fort";
};

export type AccountPlan = {
  stakes: string;
  objectives: string;
  decisionMakers: string;
  influencers: string;
  detectedNeeds: string;
  risks: string;
  feePotential: number;
  nextMoves: string;
  strategy: string;
};

export type Company = {
  id: string;
  name: string;
  kind: CompanyKind;
  sector: string;
  size: string;
  site: Site;
  address: string;
  phone: string;
  email: string;
  website: string;
  managerId: string;
  servicesBought: ServiceLine[];
  targetLines: ServiceLine[];
  source: OpportunitySource;
  strategic: boolean;
  caSigned: number;
  notes: string;
  plan?: AccountPlan;
  /** Présent si la fiche vient de Facturation (lecture seule). */
  fromFacturation?: boolean;
  cabinet?: "conseil" | "expertise_fiscale";
};

export type Opportunity = {
  id: string;
  companyId: string;
  title: string;
  line: ServiceLine;
  source: OpportunitySource;
  stage: PipelineStage;
  amount: number;
  probability: number;
  decisionOn: string;
  nextAction: string;
  nextActionOn: string;
  ownerId: string;
  notes: string;
  lostReason?: string;
  reviveOn?: string;
};

export type Activity = {
  id: string;
  companyId: string;
  opportunityId?: string;
  at: string;
  time?: string;
  kind: ActivityKind;
  title: string;
  summary: string;
  nextAction?: string;
  nextActionOn?: string;
  ownerId: string;
  status: ActivityStatus;
};

export type Lead = {
  id: string;
  companyName: string;
  companyId?: string;
  line: ServiceLine;
  need: string;
  comment: string;
  ownerId: string;
  author: string;
  status: LeadStatus;
  at: string;
};

export type Expense = {
  id: string;
  managerId: string;
  category: ExpenseCategory;
  label: string;
  amount: number;
  at: string;
  companyId?: string;
  opportunityId?: string;
  activityId?: string;
  receipt: boolean;
  approval: ExpenseApproval;
};

export type Objective = {
  id: string;
  managerId: string | "cabinet";
  metric: "qualifies" | "contacts" | "rdv" | "propositions" | "signatures";
  target: number;
};

export type CrmNotification = {
  id: string;
  title: string;
  body: string;
  at: string;
  href: string;
  read: boolean;
};

/** Lignes commerciales du CRM, plus les pôles Audit et Juridique. */
export type LibraryDomain = ServiceLine | "audit" | "juridique";

export type LibraryTerm = {
  term: string;
  def: string;
};

export type LibraryItem = {
  id: string;
  line: LibraryDomain;
  category: string;
  title: string;
  body: string;
  terms?: LibraryTerm[];
};

export type ReferentialKind = "line" | "stage" | "site" | "expense" | "sector";

export type ReferentialExtra = {
  id: string;
  kind: ReferentialKind;
  label: string;
};

export type WeekCheck = {
  id: string;
  label: string;
  done: boolean;
};

export function isoDate(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

/** Jours ouvrés (lun–ven), à partir d’aujourd’hui ou d’une date ISO. */
export function addBusinessDays(from = isoDate(), days = 1) {
  const d = new Date(`${from}T12:00:00`);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) left -= 1;
  }
  return d.toISOString().slice(0, 10);
}

export const SECTORS = [
  "Banque",
  "Énergie",
  "Santé",
  "Industrie",
  "Éducation",
  "Logistique",
  "Tourisme",
  "Assurance",
  "Agro",
  "Services",
  "Finance",
  "Holding",
  "Distribution",
  "Utilities",
  "Aviation",
  "Transport",
  "Prospect",
  "Import",
  "Autre",
];

export const COMPANY_SIZES = [
  "1–10 salariés",
  "11–50 salariés",
  "51–200 salariés",
  "200+ salariés",
];

export const EXPENSE_APPROVAL_LABELS: Record<ExpenseApproval, string> = {
  none: "Enregistrée",
  pending: "En attente Direction",
  approved: "Validée",
  rejected: "Refusée",
};

export const LIBRARY_CATEGORIES = [
  "Lexique",
  "Cibles prioritaires",
  "Argumentaires",
  "Questions de découverte",
  "Offres types",
  "Emails",
  "WhatsApp",
] as const;

export const LIBRARY_DOMAIN_LABELS: Record<LibraryDomain, string> = {
  comptabilite: "Comptabilité",
  fiscalite: "Fiscalité",
  audit: "Audit",
  juridique: "Juridique",
  rh: "Ressources humaines",
  formation: "Formation",
  conseil: "Conseil",
};

export const LIBRARY_DOMAINS: LibraryDomain[] = [
  "comptabilite",
  "fiscalite",
  "audit",
  "juridique",
  "rh",
  "formation",
  "conseil",
];

export const MONTHLY_BUDGET = 500_000;
export const BUDGET_ALERT_RATIO = 0.8;
export const EXPENSE_APPROVAL_THRESHOLD = 100_000;

export const SERVICE_LINE_LABELS: Record<ServiceLine, string> = {
  rh: "Ressources humaines",
  comptabilite: "Comptabilité",
  conseil: "Conseil",
  fiscalite: "Fiscalité",
  formation: "Formation",
};

export const SERVICE_LINES = Object.keys(SERVICE_LINE_LABELS) as ServiceLine[];

export const SITE_LABELS: Record<Site, string> = {
  libreville: "Libreville",
  port_gentil: "Port-Gentil",
  franceville: "Franceville",
};

export const STAGE_LABELS: Record<PipelineStage, string> = {
  qualification: "Qualification",
  premier_contact: "Premier contact",
  rendez_vous: "Rendez-vous",
  proposition: "Proposition",
  negotiation: "Négociation",
  decision: "Décision",
  gagne: "Gagnée",
  perdu: "Perdue",
  reporte: "Reportée",
};

export const ACTIVE_STAGES: PipelineStage[] = [
  "qualification",
  "premier_contact",
  "rendez_vous",
  "proposition",
  "negotiation",
  "decision",
];

export const STAGE_PROBABILITY: Partial<Record<PipelineStage, number>> = {
  qualification: 20,
  premier_contact: 30,
  rendez_vous: 45,
  proposition: 60,
  negotiation: 75,
  decision: 85,
  gagne: 100,
  perdu: 0,
  reporte: 10,
};

export const STAGE_ACTIVITY_KIND: Record<PipelineStage, ActivityKind> = {
  qualification: "appel",
  premier_contact: "email",
  rendez_vous: "rdv",
  proposition: "email",
  negotiation: "email",
  decision: "appel",
  gagne: "rdv",
  perdu: "email",
  reporte: "email",
};

/**
 * Prochaine action suggérée pendant que l’affaire est à cette étape :
 * ce qu’il faut faire pour avancer vers l’étape suivante (pas le travail déjà « contenu » dans l’étape actuelle).
 */
export const STAGE_NEXT_PLACEHOLDER: Record<PipelineStage, string> = {
  qualification: "Établir le premier contact",
  premier_contact: "Planifier le rendez-vous de découverte",
  rendez_vous: "Envoyer la proposition",
  proposition: "Relancer après envoi",
  negotiation: "Arbitrer les honoraires",
  decision: "Obtenir la décision",
  gagne: "Planifier le kick-off",
  perdu: "Conserver en historique",
  reporte: "Relancer dans 3 mois",
};

export const SOURCE_LABELS: Record<OpportunitySource, string> = {
  nouveau: "Nouveau client",
  client_existant: "Client existant",
  client_formation: "Client formation",
  piste_interne: "Piste interne",
};

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  appel: "Appel",
  email: "E-mail",
  visite: "Visite",
  rdv: "Rendez-vous",
  evenement: "Événement",
};

export const ACTIVITY_KINDS = Object.keys(ACTIVITY_LABELS) as ActivityKind[];

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  a_faire: "À faire",
  planifiee: "Planifiée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
  en_retard: "En retard",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nouvelle: "Nouvelle",
  en_cours: "En cours",
  qualifiee: "Qualifiée",
  convertie: "Convertie",
  rejetee: "Rejetée",
  reportee: "Reportée",
};

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  evenements: "Événements",
  relations: "Relations d’affaires",
  communication: "Communication",
  deplacements: "Déplacements",
  reserve: "Réserve",
};

export const OBJECTIVE_LABELS: Record<Objective["metric"], string> = {
  qualifies: "Prospects qualifiés",
  contacts: "Premiers contacts",
  rdv: "Rendez-vous",
  propositions: "Propositions",
  signatures: "Missions signées",
};

export const MANAGERS: Manager[] = [
  { id: "mgr-awa", name: "Awa Ndong", lines: ["formation", "rh"] },
  { id: "mgr-jean", name: "Jean-Marc Ovono", lines: ["conseil", "fiscalite"] },
  { id: "mgr-nadege", name: "Nadège Mba", lines: ["comptabilite"] },
];

export function managerName(id: string) {
  return MANAGERS.find((m) => m.id === id)?.name ?? id;
}

export function weightedAmount(o: { amount: number; probability: number }) {
  return (o.amount * o.probability) / 100;
}

export function missingServices(company: Company): ServiceLine[] {
  return SERVICE_LINES.filter((l) => !company.servicesBought.includes(l));
}

export type ClientCrmOverlay = {
  strategic?: boolean;
  managerId?: string;
  servicesBought?: ServiceLine[];
  targetLines?: ServiceLine[];
  caSigned?: number;
  notes?: string;
  site?: Site;
  sector?: string;
  size?: string;
  plan?: AccountPlan;
};

export type ProspectionData = {
  /** Prospects (et clients CRM locaux) — les clients Facturation sont chargés en live. */
  companies: Company[];
  /** Enrichissements CRM sur un client Facturation (sans écrire la fiche factu). */
  clientOverlays: Record<string, ClientCrmOverlay>;
  contacts: Contact[];
  opportunities: Opportunity[];
  activities: Activity[];
  leads: Lead[];
  expenses: Expense[];
  objectives: Objective[];
  notifications: CrmNotification[];
  libraryItems: LibraryItem[];
  referentials: ReferentialExtra[];
  weekChecks: WeekCheck[];
};

export function computeKpis(data: ProspectionData) {
  const { companies, opportunities, activities, expenses, leads } = data;
  const clients = companies.filter((c) => c.kind === "client");
  const prospects = companies.filter((c) => c.kind === "prospect");
  const active = opportunities.filter((o) => ACTIVE_STAGES.includes(o.stage));
  const won = opportunities.filter((o) => o.stage === "gagne");
  const signedCa = won.reduce((s, o) => s + o.amount, 0);
  const pipeline = active.reduce((s, o) => s + o.amount, 0);
  const weighted = active.reduce((s, o) => s + weightedAmount(o), 0);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const rdvDone = activities.filter((a) => a.kind === "rdv" && a.status === "terminee").length;
  const newWon = won.filter((o) => o.source === "nouveau").length;
  const extraWon = won.filter((o) => o.source !== "nouveau");
  const counselPipe = active.filter((o) => o.line !== "formation");
  const counselWon = won.filter((o) => o.line !== "formation");
  const pg = clients.filter((c) => c.site === "port_gentil" && c.strategic);
  const avgLines =
    clients.length === 0
      ? 0
      : clients.reduce((s, c) => s + c.servicesBought.length, 0) / clients.length;
  const today = new Date().toISOString().slice(0, 10);
  const overdueActions = opportunities.filter(
    (o) => ACTIVE_STAGES.includes(o.stage) && o.nextActionOn < today,
  );
  const staleStrategic = clients.filter((c) => {
    if (!c.strategic) return false;
    const last = activities
      .filter((a) => a.companyId === c.id)
      .map((a) => a.at)
      .sort()
      .at(-1);
    if (!last) return true;
    const diff = (Date.now() - new Date(last).getTime()) / 86400000;
    return diff > 30;
  });

  return {
    prospects: prospects.length,
    clients: clients.length,
    opportunities: active.length,
    pipeline,
    weighted,
    signedCa,
    negotiationCa: opportunities
      .filter((o) => o.stage === "negotiation" || o.stage === "decision")
      .reduce((s, o) => s + o.amount, 0),
    signatures: won.length,
    spent,
    budgetCap: MONTHLY_BUDGET * MANAGERS.length,
    rdvDone,
    calls: activities.filter((a) => a.kind === "appel").length,
    emails: activities.filter((a) => a.kind === "email").length,
    visits: activities.filter((a) => a.kind === "visite").length,
    events: activities.filter((a) => a.kind === "evenement").length,
    costPerRdv: rdvDone ? spent / rdvDone : 0,
    cac: newWon ? spent / newWon : 0,
    roi: spent ? ((signedCa - spent) / spent) * 100 : 0,
    counselPipeShare: pipeline
      ? counselPipe.reduce((s, o) => s + o.amount, 0) / pipeline
      : 0,
    counselSignShare: won.length ? counselWon.length / won.length : 0,
    extraSignedCa: extraWon.reduce((s, o) => s + o.amount, 0),
    avgLines,
    pgCount: pg.length,
    leads: leads.length,
    leadsConverted: leads.filter((l) => l.status === "convertie").length,
    overdueActions,
    staleStrategic,
    pendingApprovals: expenses.filter((e) => e.approval === "pending"),
  };
}

export function realizedForMetric(
  data: ProspectionData,
  metric: Objective["metric"],
  managerId?: string,
) {
  const ops = data.opportunities.filter((o) => !managerId || o.ownerId === managerId);
  if (metric === "qualifies") {
    return ops.filter((o) => o.stage !== "perdu").length;
  }
  if (metric === "contacts") {
    return ops.filter((o) =>
      ["premier_contact", "rendez_vous", "proposition", "negotiation", "decision", "gagne"].includes(
        o.stage,
      ),
    ).length;
  }
  if (metric === "rdv") {
    return data.activities.filter(
      (a) =>
        a.kind === "rdv" &&
        a.status === "terminee" &&
        (!managerId || a.ownerId === managerId),
    ).length;
  }
  if (metric === "propositions") {
    return ops.filter((o) =>
      ["proposition", "negotiation", "decision", "gagne"].includes(o.stage),
    ).length;
  }
  return ops.filter((o) => o.stage === "gagne").length;
}

export function createProspectionDemoSeed(): ProspectionData {
  /** État vide — hydraté depuis la BDD (objectifs / checklist seedés côté serveur). */
  return {
    companies: [],
    clientOverlays: {},
    contacts: [],
    opportunities: [],
    activities: [],
    leads: [],
    expenses: [],
    objectives: [],
    notifications: [],
    libraryItems: [],
    referentials: [],
    weekChecks: [],
  };
}

