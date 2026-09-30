import { useSyncExternalStore } from "react";
import {
  STAGE_PROBABILITY,
  createProspectionDemoSeed,
  type Activity,
  type Company,
  type Contact,
  type Expense,
  type Lead,
  type LeadStatus,
  type Opportunity,
  type PipelineStage,
  type ProspectionData,
  type ServiceLine,
} from "@/lib/prospection-demo";

type Actions = {
  upsertCompany: (company: Company) => void;
  addContact: (row: Omit<Contact, "id">) => void;
  addOpportunity: (row: Omit<Opportunity, "id">) => string;
  updateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
  setStage: (
    id: string,
    stage: PipelineStage,
    extra?: { lostReason?: string; reviveOn?: string },
  ) => void;
  addActivity: (row: Omit<Activity, "id">) => void;
  addLead: (row: Omit<Lead, "id" | "at" | "status"> & { status?: LeadStatus }) => void;
  setLeadStatus: (id: string, status: LeadStatus) => void;
  convertLead: (id: string) => void;
  addExpense: (row: Omit<Expense, "id" | "approval">) => void;
  setExpenseApproval: (id: string, approval: Expense["approval"]) => void;
  markNotificationRead: (id: string) => void;
  importCompanies: (rows: Company[]) => void;
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

const actions: Actions = {
  upsertCompany: (company) => {
    const i = data.companies.findIndex((c) => c.id === company.id);
    const companies = [...data.companies];
    if (i >= 0) companies[i] = company;
    else companies.unshift(company);
    data = { ...data, companies };
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
            }
          : o,
      ),
    };
    emit();
  },
  addActivity: (row) => {
    data = { ...data, activities: [{ ...row, id: nid("ac") }, ...data.activities] };
    emit();
  },
  addLead: (row) => {
    data = {
      ...data,
      leads: [
        {
          ...row,
          id: nid("ld"),
          at: new Date().toISOString().slice(0, 10),
          status: row.status ?? "nouvelle",
        },
        ...data.leads,
      ],
      notifications: [
        {
          id: nid("nt"),
          title: "Nouvelle piste",
          body: `${row.companyName} — ${row.need}`,
          at: new Date().toISOString().slice(0, 10),
          href: "/prospection/pistes",
          read: false,
        },
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
      decisionOn: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
      nextAction: "Qualifier le besoin",
      nextActionOn: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      ownerId: lead.ownerId,
      notes: lead.comment,
    };
    data = {
      ...data,
      companies,
      opportunities: [opportunity, ...data.opportunities],
      leads: data.leads.map((l) => (l.id === id ? { ...l, status: "convertie", companyId } : l)),
    };
    emit();
  },
  addExpense: (row) => {
    const approval =
      row.amount > 100_000 ? ("pending" as const) : ("none" as const);
    data = {
      ...data,
      expenses: [{ ...row, id: nid("ex"), approval }, ...data.expenses],
    };
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
  importCompanies: (rows) => {
    data = { ...data, companies: [...rows, ...data.companies] };
    emit();
  },
  reset: () => {
    data = createProspectionDemoSeed();
    emit();
  },
};

export function useProspectionDemoStore<T>(selector: (s: Store) => T): T {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector({ ...snap, ...actions });
}
