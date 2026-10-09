import type {
  CrmActivity,
  CrmCompany,
  CrmContact,
  CrmExpense,
  CrmLead,
  CrmLibraryItem,
  CrmNotification,
  CrmObjective,
  CrmOpportunity,
  CrmReferential,
  CrmWeekCheck,
  Prisma,
} from "@prisma/client";
import type {
  AccountPlan,
  Activity,
  ClientCrmOverlay,
  BudgetSettings,
  Company,
  Contact,
  CrmNotification as UiCrmNotification,
  Expense,
  Lead,
  LibraryItem,
  LibraryTerm,
  Manager,
  Objective,
  Opportunity,
  ReferentialExtra,
  ServiceLine,
  WeekCheck,
} from "@/lib/prospection-demo";

export type CrmCompanyRow = CrmCompany;
export type CrmCompanyWithClientId = Pick<CrmCompany, "id" | "clientId">;

function dec(n: Prisma.Decimal | number | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function dateIso(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function parseDate(iso: string | undefined | null): Date | null {
  if (!iso?.trim()) return null;
  return new Date(`${iso.trim().slice(0, 10)}T12:00:00.000Z`);
}

export function toDateInput(iso: string | undefined | null): Date | undefined {
  const d = parseDate(iso);
  return d ?? undefined;
}

/** Id exposé dans l’UI : client Facturation si lié, sinon id CRM. */
export function uiCompanyId(row: { id: string; clientId: string | null }): string {
  return row.clientId ?? row.id;
}

export function mapCrmCompany(row: CrmCompany): Company {
  const linked = Boolean(row.clientId);
  return {
    id: uiCompanyId(row),
    name: row.name,
    kind: row.kind,
    sector: row.sector,
    size: row.size,
    site: row.site,
    address: row.address,
    phone: row.phone,
    email: row.email,
    website: row.website,
    managerId: row.managerId,
    servicesBought: row.servicesBought as ServiceLine[],
    targetLines: row.targetLines as ServiceLine[],
    source: row.source,
    strategic: row.strategic,
    caSigned: dec(row.caSigned),
    notes: row.notes,
    plan: (row.plan as AccountPlan | null) ?? undefined,
    fromFacturation: linked,
  };
}

export function overlayFromCrmCompany(row: CrmCompany): ClientCrmOverlay {
  return {
    strategic: row.strategic,
    managerId: row.managerId || undefined,
    servicesBought: row.servicesBought as ServiceLine[],
    targetLines: row.targetLines as ServiceLine[],
    caSigned: dec(row.caSigned),
    notes: row.notes || undefined,
    site: row.site,
    sector: row.sector || undefined,
    size: row.size || undefined,
    plan: (row.plan as AccountPlan | null) ?? undefined,
  };
}

export function mapCrmContact(row: CrmContact, company: CrmCompanyWithClientId): Contact {
  return {
    id: row.id,
    companyId: uiCompanyId(company),
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    phone: row.phone,
    email: row.email,
    decisionMaker: row.decisionMaker,
    influence: row.influence,
  };
}

export function mapCrmLead(row: CrmLead, company?: CrmCompanyWithClientId | null): Lead {
  return {
    id: row.id,
    companyName: row.companyName,
    companyId: company ? uiCompanyId(company) : row.companyId ?? undefined,
    line: row.line,
    need: row.need,
    comment: row.comment,
    ownerId: row.ownerId,
    author: row.author,
    status: row.status,
    at: dateIso(row.at) || row.at.toISOString().slice(0, 10),
  };
}

export function mapCrmOpportunity(
  row: CrmOpportunity,
  company: CrmCompanyWithClientId,
): Opportunity {
  return {
    id: row.id,
    companyId: uiCompanyId(company),
    title: row.title,
    line: row.line,
    source: row.source,
    stage: row.stage,
    amount: dec(row.amount),
    probability: row.probability,
    decisionOn: dateIso(row.decisionOn),
    nextAction: row.nextAction,
    nextActionOn: dateIso(row.nextActionOn),
    ownerId: row.ownerId,
    notes: row.notes,
    lostReason: row.lostReason ?? undefined,
    reviveOn: dateIso(row.reviveOn) || undefined,
  };
}

export function mapCrmActivity(
  row: CrmActivity,
  company: CrmCompanyWithClientId,
): Activity {
  return {
    id: row.id,
    companyId: uiCompanyId(company),
    opportunityId: row.opportunityId ?? undefined,
    at: dateIso(row.at),
    time: row.time ?? undefined,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    nextAction: row.nextAction ?? undefined,
    nextActionOn: dateIso(row.nextActionOn) || undefined,
    ownerId: row.ownerId,
    status: row.status,
  };
}

export function mapCrmExpense(
  row: CrmExpense,
  company?: CrmCompanyWithClientId | null,
): Expense {
  return {
    id: row.id,
    managerId: row.managerId,
    category: row.category,
    label: row.label,
    amount: dec(row.amount),
    at: dateIso(row.at),
    companyId: company ? uiCompanyId(company) : row.companyId ?? undefined,
    opportunityId: row.opportunityId ?? undefined,
    activityId: row.activityId ?? undefined,
    receipt: row.receipt,
    approval: row.approval,
  };
}

export function mapCrmObjective(row: CrmObjective): Objective {
  return {
    id: row.id,
    managerId: row.managerId,
    metric: row.metric,
    target: row.target,
  };
}

export function mapCrmLibraryItem(row: CrmLibraryItem): LibraryItem {
  return {
    id: row.id,
    line: row.line,
    category: row.category,
    title: row.title,
    body: row.body,
    terms: (row.terms as LibraryTerm[] | null) ?? undefined,
  };
}

export function mapCrmReferential(row: CrmReferential): ReferentialExtra {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
  };
}

export function mapCrmWeekCheck(row: CrmWeekCheck): WeekCheck {
  return {
    id: row.id,
    label: row.label,
    done: row.done,
  };
}

export function mapCrmNotification(row: CrmNotification): UiCrmNotification {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    at: dateIso(row.at) || row.at.toISOString().slice(0, 10),
    href: row.href,
    read: row.read,
  };
}

export const DEFAULT_WEEK_CHECKS: { key: string; label: string; sortOrder: number }[] = [
  { key: "wk-1", label: "Lundi — revue pipeline (30 min)", sortOrder: 1 },
  { key: "wk-2", label: "Semaine — 5 contacts min. · 2 RDV", sortOrder: 2 },
  { key: "wk-3", label: "Après RDV — CR sous 48 h + prochaine action", sortOrder: 3 },
  { key: "wk-4", label: "RDV concluant — proposition sous 5 jours", sortOrder: 4 },
  { key: "wk-5", label: "Vendredi — dépenses à jour", sortOrder: 5 },
];

export const DEFAULT_OBJECTIVE_TARGETS: {
  metric: Objective["metric"];
  target: number;
}[] = [
  { metric: "qualifies", target: 60 },
  { metric: "contacts", target: 40 },
  { metric: "rdv", target: 15 },
  { metric: "propositions", target: 6 },
  { metric: "signatures", target: 2 },
];

export type CrmPipelineSnapshot = {
  /** Prospects / clients CRM locaux (sans clientId Facturation). */
  companies: Company[];
  /** Enrichissements CRM indexés par id client Facturation. */
  clientOverlays: Record<string, ClientCrmOverlay>;
  /** Staff réel avec accès Prospection (référents / owners). */
  managers: Manager[];
  budgetSettings: BudgetSettings;
  contacts: Contact[];
  opportunities: Opportunity[];
  activities: Activity[];
  leads: Lead[];
  expenses: Expense[];
  objectives: Objective[];
  notifications: UiCrmNotification[];
  libraryItems: LibraryItem[];
  referentials: ReferentialExtra[];
  weekChecks: WeekCheck[];
};
