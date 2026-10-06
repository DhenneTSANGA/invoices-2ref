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

export type ActivityKind =
  | "appel"
  | "email"
  | "visite"
  | "rdv"
  | "relance"
  | "evenement"
  | "tache"
  | "note";

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
  negotiation: "relance",
  decision: "tache",
  gagne: "tache",
  perdu: "note",
  reporte: "relance",
};

export const STAGE_NEXT_PLACEHOLDER: Record<PipelineStage, string> = {
  qualification: "Qualifier le besoin",
  premier_contact: "Relancer le contact",
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
  relance: "Relance",
  evenement: "Événement",
  tache: "Tâche",
  note: "Note",
};

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

export type ProspectionData = {
  companies: Company[];
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

function c(
  id: string,
  name: string,
  kind: CompanyKind,
  site: Site,
  managerId: string,
  servicesBought: ServiceLine[],
  extra: Partial<Company> = {},
): Company {
  return {
    id,
    name,
    kind,
    sector: extra.sector ?? "Services",
    size: extra.size ?? "80 salariés",
    site,
    address: extra.address ?? (site === "port_gentil" ? "Port-Gentil" : "Libreville"),
    phone: extra.phone ?? "+241 01 00 00 00",
    email: extra.email ?? `contact@${id.replace("co-", "")}.ga`,
    website: extra.website ?? "",
    managerId,
    servicesBought,
    targetLines: extra.targetLines ?? [],
    source: extra.source ?? (kind === "client" ? "client_existant" : "nouveau"),
    strategic: extra.strategic ?? false,
    caSigned: extra.caSigned ?? 0,
    notes: extra.notes ?? "",
    plan: extra.plan,
  };
}

export function createProspectionDemoSeed(): ProspectionData {
  const pgPlan = (
    stakes: string,
    needs: string,
    potential: number,
    next: string,
  ): AccountPlan => ({
    stakes,
    objectives: "Sécuriser le dirigeant et ouvrir une 2e ligne de service.",
    decisionMakers: "DG / DAF",
    influencers: "DRH, expert-comptable interne",
    detectedNeeds: needs,
    risks: "Concurrent déjà en place sur une ligne.",
    feePotential: potential,
    nextMoves: next,
    strategy: "Porte d’entrée existante → diagnostic → proposition conseil.",
  });

  const companies: Company[] = [
    c("co-atl", "Atlantic Logistics PG", "client", "port_gentil", "mgr-nadege", ["comptabilite"], {
      sector: "Logistique",
      strategic: true,
      caSigned: 9_200_000,
      plan: pgPlan("Entrepôt 2026", "Revue fiscale + tableau de bord social", 18_000_000, "Petit-déjeuner 8 oct."),
    }),
    c("co-pharma", "Pharma Ogooué", "client", "port_gentil", "mgr-awa", ["formation"], {
      sector: "Santé",
      strategic: true,
      source: "client_formation",
      caSigned: 3_100_000,
      plan: pgPlan("Paie saturée", "Externalisation paie", 12_000_000, "Entretien DRH 3 oct."),
    }),
    c("co-energie", "Énergie Littoral", "client", "port_gentil", "mgr-jean", ["formation", "comptabilite"], {
      sector: "Énergie",
      strategic: true,
      caSigned: 11_400_000,
      plan: pgPlan("Contrôle DGI T4", "Diagnostic fiscal", 25_000_000, "Atelier LFI"),
    }),
    c("co-assur", "Assurances du Cap Lopez", "client", "port_gentil", "mgr-jean", ["fiscalite"], {
      sector: "Assurance",
      strategic: true,
      caSigned: 6_800_000,
      plan: pgPlan("Croissance courtage", "Paie + formation managers", 9_000_000, "RDV DG 10 oct."),
    }),
    c("co-ciments", "Ciments du Port", "client", "port_gentil", "mgr-awa", ["rh"], {
      sector: "Industrie",
      strategic: true,
      caSigned: 4_500_000,
      plan: pgPlan("DSF chez un concurrent", "Compta sociale + DSF", 22_000_000, "Introduire Nadège"),
    }),
    c("co-soga", "SOGARA Services", "client", "port_gentil", "mgr-nadege", ["comptabilite", "rh"], {
      sector: "Industrie",
      strategic: true,
      caSigned: 8_700_000,
      plan: pgPlan("Filiales non couvertes", "Revue fiscale filiales", 16_000_000, "Proposition fin octobre"),
    }),
    c("co-ista", "ISTA", "client", "libreville", "mgr-awa", ["formation"], {
      sector: "Éducation",
      source: "client_formation",
      caSigned: 2_400_000,
    }),
    c("co-ap", "AP HOLDING", "client", "libreville", "mgr-nadege", ["comptabilite"], {
      sector: "Holding",
      caSigned: 7_800_000,
    }),
    c("co-glt", "Gabon Loisir et Tourisme", "client", "libreville", "mgr-nadege", ["comptabilite", "formation"], {
      sector: "Tourisme",
      caSigned: 5_200_000,
    }),
    c("co-cap", "CAP CARAVANE", "client", "libreville", "mgr-jean", ["conseil"], {
      sector: "Transport",
      caSigned: 3_600_000,
    }),
    c("co-anac", "ANAC Formation", "client", "libreville", "mgr-awa", ["formation", "rh"], {
      sector: "Aviation",
      source: "client_formation",
      caSigned: 4_100_000,
    }),
    c("co-bgfi", "BGFI Bourse", "client", "libreville", "mgr-jean", ["fiscalite", "conseil"], {
      sector: "Finance",
      caSigned: 14_000_000,
    }),
    c("co-seeg", "SEEG Services", "client", "libreville", "mgr-nadege", ["comptabilite"], {
      sector: "Utilities",
      caSigned: 6_000_000,
    }),
    c("co-olam", "Agro Littoral", "client", "franceville", "mgr-jean", ["fiscalite"], {
      sector: "Agro",
      caSigned: 2_900_000,
    }),
    c("co-mbolo", "Groupe Mbolo", "client", "libreville", "mgr-awa", ["rh", "formation"], {
      sector: "Distribution",
      caSigned: 5_500_000,
    }),
  ];

  const prospectNames: [string, Site, string, ServiceLine[]][] = [
    ["Banque de l’Habitat du Gabon", "libreville", "mgr-awa", ["rh"]],
    ["Groupe Mouniagui", "franceville", "mgr-jean", ["fiscalite"]],
    ["Clinique Oloumi", "libreville", "mgr-nadege", ["comptabilite"]],
    ["Air Gabon Cargo", "libreville", "mgr-jean", ["conseil"]],
    ["Port Sec Owendo", "libreville", "mgr-nadege", ["comptabilite"]],
    ["Université Omar Bongo RH", "libreville", "mgr-awa", ["rh"]],
    ["Minière Haut-Ogooué", "franceville", "mgr-jean", ["fiscalite"]],
    ["Hôtel Rapontchombo", "port_gentil", "mgr-awa", ["formation"]],
    ["SNAT Assurances", "libreville", "mgr-jean", ["conseil"]],
    ["Gabon Oil Support", "port_gentil", "mgr-nadege", ["comptabilite"]],
    ["Ferme Avicole Estuaire", "libreville", "mgr-nadege", ["comptabilite"]],
    ["Cabinet Kango Avocats", "libreville", "mgr-jean", ["fiscalite"]],
    ["Transgabonais Fret", "libreville", "mgr-awa", ["rh"]],
    ["Cimenterie Ntoum", "libreville", "mgr-jean", ["conseil"]],
    ["Pêcheries du Cap", "port_gentil", "mgr-nadege", ["comptabilite"]],
    [" collège Sainte-Marie", "libreville", "mgr-awa", ["formation"]],
    ["Telco Estuaire", "libreville", "mgr-jean", ["fiscalite"]],
    ["Immo Batignolles GA", "libreville", "mgr-nadege", ["comptabilite"]],
    ["Fondation Ndende", "libreville", "mgr-awa", ["rh"]],
    ["Chantier Naval PG", "port_gentil", "mgr-jean", ["conseil"]],
    ["Pharmacie du Port", "port_gentil", "mgr-awa", ["formation"]],
    ["SOGATRA Maintenance", "libreville", "mgr-nadege", ["comptabilite"]],
    ["Réseau Microfinance LBV", "libreville", "mgr-jean", ["fiscalite"]],
    ["Énergies du Haut", "franceville", "mgr-jean", ["conseil"]],
    ["Marché du Pk8 Logistique", "libreville", "mgr-nadege", ["comptabilite"]],
  ];

  prospectNames.forEach(([name, site, mgr, lines], i) => {
    companies.push(
      c(`co-p${i + 1}`, name.trim(), "prospect", site, mgr, [], {
        sector: "Prospect",
        targetLines: lines,
        source: "nouveau",
      }),
    );
  });

  const contacts: Contact[] = companies.flatMap((co, i) => [
    {
      id: `ct-${co.id}-1`,
      companyId: co.id,
      firstName: ["Patrice", "Léa", "Hervé", "Sylvie", "Alain", "Claire"][i % 6],
      lastName: ["Mengue", "Issembé", "Boulingui", "Ntoutoume", "Mouity", "Bekale"][i % 6],
      role: i % 2 === 0 ? "DG" : "DAF",
      phone: `+241 06 ${String(100000 + i).slice(-6)}`,
      email: `dir@${co.id}.ga`,
      decisionMaker: true,
      influence: "fort",
    },
  ]);

  const opportunities: Opportunity[] = [
    {
      id: "op-atl",
      companyId: "co-atl",
      title: "Revue fiscale 2026",
      line: "fiscalite",
      source: "client_existant",
      stage: "rendez_vous",
      amount: 8_500_000,
      probability: 45,
      decisionOn: "2026-11-15",
      nextAction: "Petit-déjeuner dirigeants",
      nextActionOn: "2026-10-08",
      ownerId: "mgr-jean",
      notes: "Porte d’entrée via la compta.",
    },
    {
      id: "op-pharma",
      companyId: "co-pharma",
      title: "Externalisation paie",
      line: "rh",
      source: "client_formation",
      stage: "proposition",
      amount: 6_200_000,
      probability: 60,
      decisionOn: "2026-10-20",
      nextAction: "Relancer après envoi",
      nextActionOn: "2026-10-06",
      ownerId: "mgr-awa",
      notes: "Proposition v1 envoyée.",
    },
    {
      id: "op-energie",
      companyId: "co-energie",
      title: "Diagnostic contrôle fiscal",
      line: "fiscalite",
      source: "client_existant",
      stage: "premier_contact",
      amount: 12_000_000,
      probability: 30,
      decisionOn: "2026-12-01",
      nextAction: "Confirmer atelier LFI",
      nextActionOn: "2026-10-04",
      ownerId: "mgr-jean",
      notes: "DAF ouvert par téléphone.",
    },
    {
      id: "op-assur",
      companyId: "co-assur",
      title: "Socle paie",
      line: "rh",
      source: "client_existant",
      stage: "qualification",
      amount: 4_800_000,
      probability: 20,
      decisionOn: "2026-11-30",
      nextAction: "RDV mensuel DG",
      nextActionOn: "2026-10-10",
      ownerId: "mgr-awa",
      notes: "Besoin confirmé.",
    },
    {
      id: "op-ciments",
      companyId: "co-ciments",
      title: "Reprise DSF",
      line: "comptabilite",
      source: "client_existant",
      stage: "qualification",
      amount: 9_000_000,
      probability: 20,
      decisionOn: "2027-01-15",
      nextAction: "Introduire Nadège au DAF",
      nextActionOn: "2026-10-07",
      ownerId: "mgr-nadege",
      notes: "Piste RH → compta.",
    },
    {
      id: "op-soga",
      companyId: "co-soga",
      title: "Revue fiscale filiales",
      line: "fiscalite",
      source: "client_existant",
      stage: "proposition",
      amount: 11_000_000,
      probability: 60,
      decisionOn: "2026-10-31",
      nextAction: "Relance siège",
      nextActionOn: "2026-10-09",
      ownerId: "mgr-jean",
      notes: "Proposition additionnelle PG.",
    },
    {
      id: "op-ista",
      companyId: "co-ista",
      title: "Entretien conseil organisation",
      line: "conseil",
      source: "client_formation",
      stage: "premier_contact",
      amount: 3_500_000,
      probability: 30,
      decisionOn: "2026-11-10",
      nextAction: "Appel directrice",
      nextActionOn: "2026-10-02",
      ownerId: "mgr-awa",
      notes: "Repositionnement formation → conseil.",
    },
    {
      id: "op-bhg",
      companyId: "co-p1",
      title: "Référentiel emplois cadres",
      line: "rh",
      source: "nouveau",
      stage: "rendez_vous",
      amount: 15_000_000,
      probability: 45,
      decisionOn: "2026-11-20",
      nextAction: "Compte rendu sous 48 h",
      nextActionOn: "2026-10-01",
      ownerId: "mgr-awa",
      notes: "RDV découverte réalisé.",
    },
    {
      id: "op-mouni",
      companyId: "co-p2",
      title: "Accompagnement DSF + IS",
      line: "fiscalite",
      source: "nouveau",
      stage: "qualification",
      amount: 7_400_000,
      probability: 20,
      decisionOn: "2026-12-10",
      nextAction: "E-mail argumentaire",
      nextActionOn: "2026-10-05",
      ownerId: "mgr-jean",
      notes: "Chambre de commerce.",
    },
    {
      id: "op-oloumi",
      companyId: "co-p3",
      title: "Tenue comptable clinique",
      line: "comptabilite",
      source: "nouveau",
      stage: "qualification",
      amount: 5_200_000,
      probability: 20,
      decisionOn: "2026-12-20",
      nextAction: "Qualifier le volume",
      nextActionOn: "2026-10-03",
      ownerId: "mgr-nadege",
      notes: "Salon santé.",
    },
    {
      id: "op-ap",
      companyId: "co-ap",
      title: "Audit social holding",
      line: "rh",
      source: "piste_interne",
      stage: "gagne",
      amount: 4_200_000,
      probability: 100,
      decisionOn: "2026-09-22",
      nextAction: "Kick-off production (facturation)",
      nextActionOn: "2026-10-12",
      ownerId: "mgr-awa",
      notes: "Signé — hors cet espace.",
    },
    {
      id: "op-nego",
      companyId: "co-bgfi",
      title: "Mission conseil gouvernance",
      line: "conseil",
      source: "client_existant",
      stage: "negotiation",
      amount: 18_000_000,
      probability: 75,
      decisionOn: "2026-10-18",
      nextAction: "Arbitrage honoraires",
      nextActionOn: "2026-10-11",
      ownerId: "mgr-jean",
      notes: "En négociation comité.",
    },
    {
      id: "op-dec",
      companyId: "co-mbolo",
      title: "Structuration paie magasins",
      line: "rh",
      source: "client_existant",
      stage: "decision",
      amount: 7_800_000,
      probability: 85,
      decisionOn: "2026-10-08",
      nextAction: "Relance DG",
      nextActionOn: "2026-10-07",
      ownerId: "mgr-awa",
      notes: "Décision attendue.",
    },
    {
      id: "op-lost",
      companyId: "co-p3",
      title: "Formation encadrement",
      line: "formation",
      source: "nouveau",
      stage: "reporte",
      amount: 2_800_000,
      probability: 10,
      decisionOn: "2027-01-10",
      nextAction: "Relance 3 mois",
      nextActionOn: "2026-12-28",
      ownerId: "mgr-awa",
      notes: "Budget 2026 figé.",
      reviveOn: "2026-12-28",
    },
  ];

  const activities: Activity[] = [
    { id: "ac-1", companyId: "co-p1", opportunityId: "op-bhg", at: "2026-09-29", time: "10:00", kind: "rdv", title: "Découverte DRH", summary: "Besoin référentiel cadres, délai T4.", ownerId: "mgr-awa", status: "terminee" },
    { id: "ac-2", companyId: "co-pharma", opportunityId: "op-pharma", at: "2026-09-29", kind: "email", title: "Proposition paie", summary: "Version 1 envoyée.", ownerId: "mgr-awa", status: "terminee" },
    { id: "ac-3", companyId: "co-energie", opportunityId: "op-energie", at: "2026-09-28", kind: "appel", title: "Appel DAF", summary: "Accord de principe atelier.", ownerId: "mgr-jean", status: "terminee" },
    { id: "ac-4", companyId: "co-atl", opportunityId: "op-atl", at: "2026-10-08", time: "08:00", kind: "evenement", title: "Petit-déjeuner PG", summary: "Dirigeants logistique.", ownerId: "mgr-jean", status: "planifiee" },
    { id: "ac-5", companyId: "co-soga", opportunityId: "op-soga", at: "2026-10-09", kind: "relance", title: "Relance siège", summary: "Proposition filiales.", ownerId: "mgr-jean", status: "a_faire" },
    { id: "ac-6", companyId: "co-assur", at: "2026-10-10", time: "15:00", kind: "rdv", title: "RDV mensuel DG", summary: "Suivi Port-Gentil.", ownerId: "mgr-awa", status: "planifiee" },
    { id: "ac-7", companyId: "co-ap", opportunityId: "op-ap", at: "2026-09-22", kind: "note", title: "Signature", summary: "Mission RH signée.", ownerId: "mgr-awa", status: "terminee" },
    { id: "ac-8", companyId: "co-ciments", at: "2026-09-12", kind: "visite", title: "Visite usine", summary: "Site Port-Gentil.", ownerId: "mgr-awa", status: "terminee" },
    { id: "ac-9", companyId: "co-bgfi", opportunityId: "op-nego", at: "2026-10-11", kind: "tache", title: "Préparer grille d’honoraires", summary: "Négociation.", ownerId: "mgr-jean", status: "a_faire" },
    { id: "ac-10", companyId: "co-ista", opportunityId: "op-ista", at: "2026-10-02", kind: "appel", title: "Appel directrice", summary: "Repositionnement conseil.", ownerId: "mgr-awa", status: "en_retard" },
  ];

  const moreActs: Activity[] = companies.slice(0, 20).map((co, i) => ({
    id: `ac-m${i}`,
    companyId: co.id,
    at: `2026-09-${String(10 + (i % 18)).padStart(2, "0")}`,
    kind: (["appel", "email", "visite", "note"] as ActivityKind[])[i % 4],
    title: "Suivi commercial",
    summary: `Échange #${i + 1} avec ${co.name}.`,
    ownerId: co.managerId,
    status: "terminee" as const,
  }));

  const leads: Lead[] = [
    { id: "ld-1", companyName: "AP HOLDING", companyId: "co-ap", line: "rh", need: "Audit social", comment: "Recrutement T4 annoncé par le collaborateur paie.", ownerId: "mgr-awa", author: "Collaborateur paie", status: "convertie", at: "2026-09-10" },
    { id: "ld-2", companyName: "ISTA", companyId: "co-ista", line: "conseil", need: "Organisation interne", comment: "Après session formation managers.", ownerId: "mgr-awa", author: "Formateur", status: "qualifiee", at: "2026-09-25" },
    { id: "ld-3", companyName: "Ciments du Port", companyId: "co-ciments", line: "comptabilite", need: "DSF", comment: "DAF mécontent du cabinet actuel.", ownerId: "mgr-nadege", author: "Consultant RH", status: "en_cours", at: "2026-09-27" },
    { id: "ld-4", companyName: "Clinique Oloumi", line: "comptabilite", need: "Tenue", comment: "Salon santé.", ownerId: "mgr-nadege", author: "Awa Ndong", status: "nouvelle", at: "2026-09-30" },
  ];

  const expenses: Expense[] = [
    { id: "ex-1", managerId: "mgr-jean", category: "evenements", label: "Petit-déjeuner dirigeants PG", amount: 145_000, at: "2026-09-26", companyId: "co-atl", opportunityId: "op-atl", receipt: true, approval: "pending" },
    { id: "ex-2", managerId: "mgr-awa", category: "relations", label: "Déjeuner DRH Banque Habitat", amount: 48_000, at: "2026-09-29", companyId: "co-p1", opportunityId: "op-bhg", receipt: true, approval: "none" },
    { id: "ex-3", managerId: "mgr-nadege", category: "deplacements", label: "LBV → Port-Gentil", amount: 85_000, at: "2026-09-24", companyId: "co-soga", receipt: true, approval: "none" },
    { id: "ex-4", managerId: "mgr-jean", category: "communication", label: "Plaquettes offre conseil", amount: 72_000, at: "2026-09-20", receipt: true, approval: "none" },
    { id: "ex-5", managerId: "mgr-awa", category: "evenements", label: "Atelier RH", amount: 110_000, at: "2026-09-18", receipt: true, approval: "approved" },
    { id: "ex-6", managerId: "mgr-nadege", category: "relations", label: "Café DAF Ciments", amount: 22_000, at: "2026-09-21", companyId: "co-ciments", receipt: true, approval: "none" },
    { id: "ex-7", managerId: "mgr-jean", category: "deplacements", label: "Franceville 2 jours", amount: 95_000, at: "2026-09-15", companyId: "co-p2", receipt: true, approval: "none" },
    { id: "ex-8", managerId: "mgr-awa", category: "communication", label: "LinkedIn sponsorisé", amount: 40_000, at: "2026-09-12", receipt: true, approval: "none" },
    { id: "ex-9", managerId: "mgr-nadege", category: "reserve", label: "Imprévu salon", amount: 30_000, at: "2026-09-08", receipt: true, approval: "none" },
    { id: "ex-10", managerId: "mgr-jean", category: "relations", label: "Dîner comité BGFI", amount: 65_000, at: "2026-09-27", companyId: "co-bgfi", receipt: true, approval: "none" },
  ];

  const objectives: Objective[] = MANAGERS.flatMap((m) =>
    (
      [
        ["qualifies", 60],
        ["contacts", 40],
        ["rdv", 15],
        ["propositions", 6],
        ["signatures", 2],
      ] as const
    ).map(([metric, target]) => ({
      id: `ob-${m.id}-${metric}`,
      managerId: m.id,
      metric,
      target,
    })),
  );

  const notifications: CrmNotification[] = [
    { id: "nt-1", title: "Budget à valider", body: "Dépense 145 000 FCFA — petit-déjeuner PG.", at: "2026-09-26", href: "/prospection/budget", read: false },
    { id: "nt-2", title: "Action en retard", body: "Appel ISTA non saisi sous 48 h.", at: "2026-10-02", href: "/prospection/activites", read: false },
    { id: "nt-3", title: "Nouvelle piste", body: "Clinique Oloumi — tenue comptable.", at: "2026-09-30", href: "/prospection/pistes", read: false },
    { id: "nt-4", title: "Opportunité gagnée", body: "AP HOLDING — audit social 4,2 M.", at: "2026-09-22", href: "/prospection/opportunites", read: true },
  ];

  return {
    companies,
    contacts,
    opportunities,
    activities: [...activities, ...moreActs],
    leads,
    expenses,
    objectives,
    notifications,
    libraryItems: [],
    referentials: [],
    weekChecks: [
      { id: "wk-1", label: "Lundi — revue pipeline (30 min)", done: false },
      { id: "wk-2", label: "Semaine — 5 contacts min. · 2 RDV", done: false },
      { id: "wk-3", label: "Après RDV — CR sous 48 h + prochaine action", done: false },
      { id: "wk-4", label: "RDV concluant — proposition sous 5 jours", done: false },
      { id: "wk-5", label: "Vendredi — dépenses à jour", done: false },
    ],
  };
}

