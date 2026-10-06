import { useSyncExternalStore } from "react";
import {
  STAGE_PROBABILITY,
  STAGE_LABELS,
  createProspectionDemoSeed,
  isoDate,
  type AccountPlan,
  type Activity,
  type ActivityKind,
  type ActivityStatus,
  type Company,
  type Contact,
  type Expense,
  type Lead,
  type LeadStatus,
  type LibraryItem,
  type Opportunity,
  type PipelineStage,
  type ProspectionData,
  type ReferentialExtra,
  type ReferentialKind,
  type ServiceLine,
} from "@/lib/prospection-demo";

type Actions = {
  upsertCompany: (company: Company) => void;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  convertProspect: (id: string) => void;
  addContact: (row: Omit<Contact, "id">) => void;
  addOpportunity: (row: Omit<Opportunity, "id">) => string;
  updateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
  setStage: (
    id: string,
    stage: PipelineStage,
    extra?: { lostReason?: string; reviveOn?: string; nextAction?: string; nextActionOn?: string },
  ) => void;
  advanceStage: (
    id: string,
    stage: PipelineStage,
    payload: {
      kind: ActivityKind;
      title: string;
      summary: string;
      nextAction: string;
      nextActionOn: string;
      lostReason?: string;
      reviveOn?: string;
    },
  ) => void;
  addActivity: (row: Omit<Activity, "id">) => void;
  updateActivity: (id: string, patch: Partial<Activity>) => void;
  setActivityStatus: (id: string, status: ActivityStatus) => void;
  addLead: (row: Omit<Lead, "id" | "at" | "status"> & { status?: LeadStatus }) => void;
  setLeadStatus: (id: string, status: LeadStatus) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  convertLead: (id: string) => void;
  addExpense: (row: Omit<Expense, "id" | "approval">) => void;
  setExpenseApproval: (id: string, approval: Expense["approval"]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  importCompanies: (rows: Company[]) => void;
  setObjectiveTarget: (id: string, target: number) => void;
  addLibraryItem: (row: Omit<LibraryItem, "id">) => void;
  addReferential: (kind: ReferentialKind, label: string) => void;
  setAccountPlan: (companyId: string, plan: AccountPlan) => void;
  toggleWeekCheck: (id: string) => void;
  reset: () => void;
};

type Store = ProspectionData & Actions;

let data: ProspectionData = createProspectionDemoSeed();
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return data;
}

let seq = 1;
function nid(prefix: string) {
  return `${prefix}-${seq++}`;
}

function withWonContract(companies: Company[], opportunity: Opportunity, nextStage: PipelineStage) {
  if (nextStage !== "gagne" || opportunity.stage === "gagne") return companies;
  return companies.map((c) => {
    if (c.id !== opportunity.companyId) return c;
    const servicesBought = c.servicesBought.includes(opportunity.line)
      ? c.servicesBought
      : [...c.servicesBought, opportunity.line];
    return {
      ...c,
      caSigned: c.caSigned + opportunity.amount,
      servicesBought,
    };
  });
}

function notify(title: string, body: string, href: string) {
  return {
    id: nid("nt"),
    title,
    body,
    at: isoDate(),
    href,
    read: false,
  };
}

const actions: Actions = {
  upsertCompany: (company) => {
    const i = data.companies.findIndex((c) => c.id === company.id);
    const companies = [...data.companies];
    if (i >= 0) companies[i] = company;
    else companies.unshift(company);
    data = { ...data, companies };
    emit();
  },
  updateCompany: (id, patch) => {
    data = {
      ...data,
      companies: data.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    };
    emit();
  },
  convertProspect: (id) => {
    const company = data.companies.find((c) => c.id === id);
    if (!company) return;
    data = {
      ...data,
      companies: data.companies.map((c) =>
        c.id === id
          ? {
              ...c,
              kind: "client" as const,
              source: c.source === "nouveau" ? "client_existant" : c.source,
              servicesBought: c.servicesBought.length ? c.servicesBought : c.targetLines.slice(0, 1),
            }
          : c,
      ),
      notifications: [
        notify("Prospect converti", `${company.name} est désormais un client.`, "/prospection/clients"),
        ...data.notifications,
      ],
    };
    emit();
  },
  addContact: (row) => {
    data = { ...data, contacts: [{ ...row, id: nid("ct") }, ...data.contacts] };
    emit();
  },
  addOpportunity: (row) => {
    const id = nid("op");
    data = { ...data, opportunities: [{ ...row, id }, ...data.opportunities] };
    emit();
    return id;
  },
  updateOpportunity: (id, patch) => {
    data = {
      ...data,
      opportunities: data.opportunities.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    };
    emit();
  },
  setStage: (id, stage, extra) => {
    data = {
      ...data,
      opportunities: data.opportunities.map((o) =>
        o.id === id
          ? {
              ...o,
              stage,
              probability: STAGE_PROBABILITY[stage] ?? o.probability,
              lostReason: extra?.lostReason ?? o.lostReason,
              reviveOn: extra?.reviveOn ?? o.reviveOn,
              nextAction: extra?.nextAction ?? o.nextAction,
              nextActionOn: extra?.nextActionOn ?? o.nextActionOn,
            }
          : o,
      ),
    };
    emit();
  },
  advanceStage: (id, stage, payload) => {
    const current = data.opportunities.find((o) => o.id === id);
    if (!current) return;
    const company = data.companies.find((c) => c.id === current.companyId);
    data = {
      ...data,
      companies: withWonContract(data.companies, current, stage),
      opportunities: data.opportunities.map((o) => {
        if (o.id !== id) return o;
        return {
          ...o,
          stage,
          probability: STAGE_PROBABILITY[stage] ?? o.probability,
          nextAction: payload.nextAction,
          nextActionOn: payload.nextActionOn,
          lostReason: payload.lostReason ?? o.lostReason,
          reviveOn: payload.reviveOn ?? o.reviveOn,
        };
      }),
      activities: [
        {
          id: nid("ac"),
          companyId: current.companyId,
          opportunityId: id,
          at: isoDate(),
          kind: payload.kind,
          title: payload.title,
          summary: payload.summary,
          ownerId: current.ownerId,
          status: "terminee" as const,
        },
        ...data.activities,
      ],
      notifications: [
        notify(
          `Étape : ${STAGE_LABELS[stage]}`,
          `${company?.name ?? "Affaire"} — ${payload.nextAction}`,
          "/prospection/opportunites",
        ),
        ...data.notifications,
      ],
    };
    emit();
  },
  addActivity: (row) => {
    const next = { ...row, id: nid("ac") };
    let opportunities = data.opportunities;
    if (row.opportunityId && row.nextAction?.trim()) {
      opportunities = data.opportunities.map((o) =>
        o.id === row.opportunityId
          ? {
              ...o,
              nextAction: row.nextAction!.trim(),
              nextActionOn: row.nextActionOn || o.nextActionOn,
            }
          : o,
      );
    }
    data = { ...data, activities: [next, ...data.activities], opportunities };
    emit();
  },
  updateActivity: (id, patch) => {
    data = {
      ...data,
      activities: data.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    };
    emit();
  },
  setActivityStatus: (id, status) => {
    data = {
      ...data,
      activities: data.activities.map((a) => (a.id === id ? { ...a, status } : a)),
    };
    emit();
  },
  addLead: (row) => {
    data = {
      ...data,
      leads: [
        {
          ...row,
          id: nid("ld"),
          at: isoDate(),
          status: row.status ?? "nouvelle",
        },
        ...data.leads,
      ],
      notifications: [
        notify("Nouvelle piste", `${row.companyName} — ${row.need}`, "/prospection/pistes"),
        ...data.notifications,
      ],
    };
    emit();
  },
  setLeadStatus: (id, status) => {
    data = {
      ...data,
      leads: data.leads.map((l) => (l.id === id ? { ...l, status } : l)),
    };
    emit();
  },
  updateLead: (id, patch) => {
    data = {
      ...data,
      leads: data.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    };
    emit();
  },
  convertLead: (id) => {
    const lead = data.leads.find((l) => l.id === id);
    if (!lead) return;
    const existing = data.companies.find(
      (c) => c.name.toLowerCase() === lead.companyName.trim().toLowerCase(),
    );
    const companyId = existing?.id ?? nid("co");
    const companies = existing
      ? data.companies
      : [
          {
            id: companyId,
            name: lead.companyName.trim(),
            kind: "client" as const,
            sector: "À préciser",
            size: "—",
            site: "libreville" as const,
            address: "Libreville",
            phone: "",
            email: "",
            website: "",
            managerId: lead.ownerId,
            servicesBought: [] as ServiceLine[],
            targetLines: [lead.line],
            source: "piste_interne" as const,
            strategic: false,
            caSigned: 0,
            notes: lead.comment,
          },
          ...data.companies,
        ];
    const opportunity: Opportunity = {
      id: nid("op"),
      companyId,
      title: lead.need,
      line: lead.line,
      source: "piste_interne",
      stage: "qualification",
      amount: 0,
      probability: 20,
      decisionOn: isoDate(45),
      nextAction: "Qualifier le besoin",
      nextActionOn: isoDate(2),
      ownerId: lead.ownerId,
      notes: lead.comment,
    };
    data = {
      ...data,
      companies,
      opportunities: [opportunity, ...data.opportunities],
      leads: data.leads.map((l) => (l.id === id ? { ...l, status: "convertie", companyId } : l)),
      notifications: [
        notify("Piste convertie", `${lead.companyName} — opportunité en Qualification.`, "/prospection/opportunites"),
        ...data.notifications,
      ],
    };
    emit();
  },
  addExpense: (row) => {
    const approval = row.amount > 100_000 ? ("pending" as const) : ("none" as const);
    const next = {
      ...data,
      expenses: [{ ...row, id: nid("ex"), approval }, ...data.expenses],
    };
    if (approval === "pending") {
      next.notifications = [
        notify("Budget à valider", `${row.label} — ${row.amount.toLocaleString("fr-FR")} FCFA`, "/prospection/budget"),
        ...data.notifications,
      ];
    }
    data = next;
    emit();
  },
  setExpenseApproval: (id, approval) => {
    data = {
      ...data,
      expenses: data.expenses.map((e) => (e.id === id ? { ...e, approval } : e)),
    };
    emit();
  },
  markNotificationRead: (id) => {
    data = {
      ...data,
      notifications: data.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    };
    emit();
  },
  markAllNotificationsRead: () => {
    data = {
      ...data,
      notifications: data.notifications.map((n) => ({ ...n, read: true })),
    };
    emit();
  },
  importCompanies: (rows) => {
    data = { ...data, companies: [...rows, ...data.companies] };
    emit();
  },
  setObjectiveTarget: (id, target) => {
    data = {
      ...data,
      objectives: data.objectives.map((o) => (o.id === id ? { ...o, target } : o)),
    };
    emit();
  },
  addLibraryItem: (row) => {
    data = {
      ...data,
      libraryItems: [{ ...row, id: nid("lb") }, ...data.libraryItems],
    };
    emit();
  },
  addReferential: (kind, label) => {
    const item: ReferentialExtra = { id: nid("rf"), kind, label };
    data = { ...data, referentials: [item, ...data.referentials] };
    emit();
  },
  setAccountPlan: (companyId, plan) => {
    data = {
      ...data,
      companies: data.companies.map((c) => (c.id === companyId ? { ...c, plan } : c)),
    };
    emit();
  },
  toggleWeekCheck: (id) => {
    data = {
      ...data,
      weekChecks: data.weekChecks.map((w) => (w.id === id ? { ...w, done: !w.done } : w)),
    };
    emit();
  },
  reset: () => {
    seq = 1;
    data = createProspectionDemoSeed();
    emit();
  },
};

export function useProspectionDemoStore<T>(selector: (s: Store) => T): T {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector({ ...snap, ...actions });
}
