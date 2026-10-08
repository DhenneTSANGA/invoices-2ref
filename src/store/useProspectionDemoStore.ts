import { useSyncExternalStore } from "react";
import {
  STAGE_PROBABILITY,
  createProspectionDemoSeed,
  setManagersCache,
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
  type ClientCrmOverlay,
  type ProspectionData,
  type ReferentialExtra,
  type ReferentialKind,
} from "@/lib/prospection-demo";
import type { CrmPipelineSnapshot } from "@/lib/prospection-db";
import {
  advanceCrmOpportunity,
  convertCrmLead,
  convertCrmProspect,
  createCrmContact,
  createCrmExpense,
  createCrmLibraryItem,
  createCrmReferential,
  importCrmCompanies,
  listCrmPipeline,
  markAllCrmNotificationsRead,
  markCrmNotificationRead,
  setCrmAccountPlan,
  setCrmActivityStatus,
  setCrmClientOverlay,
  setCrmExpenseApproval,
  setCrmLeadStatus,
  setCrmObjectiveTarget,
  toggleCrmWeekCheck,
  updateCrmCompany,
  upsertCrmActivity,
  upsertCrmCompany,
  upsertCrmLead,
  upsertCrmOpportunity,
} from "@/lib/prospection.functions";

type Actions = {
  hydratePipeline: (snapshot: CrmPipelineSnapshot) => void;
  reloadPipeline: () => Promise<void>;
  upsertCompany: (company: Company) => Promise<Company>;
  updateCompany: (id: string, patch: Partial<Company>) => Promise<void>;
  setClientOverlay: (id: string, patch: ClientCrmOverlay) => Promise<void>;
  convertProspect: (id: string) => Promise<Company>;
  addContact: (row: Omit<Contact, "id">) => Promise<void>;
  addOpportunity: (row: Omit<Opportunity, "id">) => Promise<string>;
  updateOpportunity: (id: string, patch: Partial<Opportunity>) => Promise<void>;
  setStage: (
    id: string,
    stage: PipelineStage,
    extra?: { lostReason?: string; reviveOn?: string; nextAction?: string; nextActionOn?: string },
  ) => Promise<void>;
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
  ) => Promise<void>;
  addActivity: (row: Omit<Activity, "id">) => Promise<void>;
  updateActivity: (id: string, patch: Partial<Activity>) => Promise<void>;
  setActivityStatus: (id: string, status: ActivityStatus) => Promise<void>;
  addLead: (row: Omit<Lead, "id" | "at" | "status"> & { status?: LeadStatus }) => Promise<void>;
  setLeadStatus: (id: string, status: LeadStatus) => Promise<void>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  convertLead: (id: string) => Promise<void>;
  addExpense: (row: Omit<Expense, "id" | "approval">) => Promise<void>;
  setExpenseApproval: (id: string, approval: Expense["approval"]) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  importCompanies: (rows: Company[]) => Promise<void>;
  setObjectiveTarget: (id: string, target: number) => Promise<void>;
  addLibraryItem: (row: Omit<LibraryItem, "id">) => Promise<void>;
  addReferential: (kind: ReferentialKind, label: string) => Promise<void>;
  setAccountPlan: (companyId: string, plan: AccountPlan) => Promise<void>;
  toggleWeekCheck: (id: string) => Promise<void>;
  reset: () => Promise<void>;
};

type Store = ProspectionData & Actions;

let data: ProspectionData = createProspectionDemoSeed();
let pipelineReady = false;
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

function applyPipelineSnapshot(snapshot: CrmPipelineSnapshot) {
  setManagersCache(snapshot.managers);
  data = {
    ...data,
    companies: snapshot.companies,
    clientOverlays: snapshot.clientOverlays,
    managers: snapshot.managers,
    contacts: snapshot.contacts,
    opportunities: snapshot.opportunities,
    activities: snapshot.activities,
    leads: snapshot.leads,
    expenses: snapshot.expenses,
    objectives: snapshot.objectives,
    notifications: snapshot.notifications,
    libraryItems: snapshot.libraryItems,
    referentials: snapshot.referentials,
    weekChecks: snapshot.weekChecks,
  };
  pipelineReady = true;
  emit();
}

const actions: Actions = {
  hydratePipeline: (snapshot) => {
    applyPipelineSnapshot(snapshot);
  },
  reloadPipeline: async () => {
    const snapshot = await listCrmPipeline();
    applyPipelineSnapshot(snapshot);
  },
  upsertCompany: async (company) => {
    if (company.fromFacturation) {
      const { strategic, managerId, servicesBought, targetLines, caSigned, notes, site, sector, size, plan } =
        company;
      await setCrmClientOverlay({
        data: {
          clientId: company.id,
          strategic,
          managerId,
          servicesBought,
          targetLines,
          caSigned,
          notes,
          site,
          sector,
          size,
          plan,
        },
      });
      await actions.reloadPipeline();
      return company;
    }
    const saved = await upsertCrmCompany({
      data: {
        id: company.id.startsWith("co-new-") ? undefined : company.id,
        name: company.name,
        kind: company.kind,
        sector: company.sector,
        size: company.size,
        site: company.site,
        address: company.address,
        phone: company.phone,
        email: company.email,
        website: company.website,
        managerId: company.managerId,
        servicesBought: company.servicesBought,
        targetLines: company.targetLines,
        source: company.source,
        strategic: company.strategic,
        caSigned: company.caSigned,
        notes: company.notes,
        plan: company.plan,
      },
    });
    await actions.reloadPipeline();
    return saved;
  },
  updateCompany: async (id, patch) => {
    const local = data.companies.some((c) => c.id === id);
    if (local) {
      await updateCrmCompany({ data: { id, ...patch } });
    } else {
      await setCrmClientOverlay({ data: { clientId: id, ...patch } });
    }
    await actions.reloadPipeline();
  },
  setClientOverlay: async (id, patch) => {
    await setCrmClientOverlay({ data: { clientId: id, ...patch } });
    await actions.reloadPipeline();
  },
  convertProspect: async (id) => {
    const converted = await convertCrmProspect({ data: { id } });
    await actions.reloadPipeline();
    return converted;
  },
  addContact: async (row) => {
    await createCrmContact({ data: row });
    await actions.reloadPipeline();
  },
  addOpportunity: async (row) => {
    const created = await upsertCrmOpportunity({ data: row });
    await actions.reloadPipeline();
    return created.id;
  },
  updateOpportunity: async (id, patch) => {
    const current = data.opportunities.find((o) => o.id === id);
    if (!current) return;
    await upsertCrmOpportunity({
      data: {
        id,
        companyId: patch.companyId ?? current.companyId,
        title: patch.title ?? current.title,
        line: patch.line ?? current.line,
        source: patch.source ?? current.source,
        stage: patch.stage ?? current.stage,
        amount: patch.amount ?? current.amount,
        probability: patch.probability ?? current.probability,
        decisionOn: patch.decisionOn ?? current.decisionOn,
        nextAction: patch.nextAction ?? current.nextAction,
        nextActionOn: patch.nextActionOn ?? current.nextActionOn,
        ownerId: patch.ownerId ?? current.ownerId,
        notes: patch.notes ?? current.notes,
        lostReason: patch.lostReason ?? current.lostReason,
        reviveOn: patch.reviveOn ?? current.reviveOn,
      },
    });
    await actions.reloadPipeline();
  },
  setStage: async (id, stage, extra) => {
    const current = data.opportunities.find((o) => o.id === id);
    if (!current) return;
    await upsertCrmOpportunity({
      data: {
        id,
        companyId: current.companyId,
        title: current.title,
        line: current.line,
        source: current.source,
        stage,
        amount: current.amount,
        probability: STAGE_PROBABILITY[stage] ?? current.probability,
        decisionOn: current.decisionOn,
        nextAction: extra?.nextAction ?? current.nextAction,
        nextActionOn: extra?.nextActionOn ?? current.nextActionOn,
        ownerId: current.ownerId,
        notes: current.notes,
        lostReason: extra?.lostReason ?? current.lostReason,
        reviveOn: extra?.reviveOn ?? current.reviveOn,
      },
    });
    await actions.reloadPipeline();
  },
  advanceStage: async (id, stage, payload) => {
    await advanceCrmOpportunity({
      data: {
        id,
        stage,
        kind: payload.kind,
        title: payload.title,
        summary: payload.summary,
        nextAction: payload.nextAction,
        nextActionOn: payload.nextActionOn,
        lostReason: payload.lostReason,
        reviveOn: payload.reviveOn,
      },
    });
    await actions.reloadPipeline();
  },
  addActivity: async (row) => {
    await upsertCrmActivity({ data: row });
    await actions.reloadPipeline();
  },
  updateActivity: async (id, patch) => {
    const current = data.activities.find((a) => a.id === id);
    if (!current) return;
    await upsertCrmActivity({
      data: {
        id,
        companyId: patch.companyId ?? current.companyId,
        opportunityId: patch.opportunityId ?? current.opportunityId,
        at: patch.at ?? current.at,
        time: patch.time ?? current.time,
        kind: patch.kind ?? current.kind,
        title: patch.title ?? current.title,
        summary: patch.summary ?? current.summary,
        nextAction: patch.nextAction ?? current.nextAction,
        nextActionOn: patch.nextActionOn ?? current.nextActionOn,
        ownerId: patch.ownerId ?? current.ownerId,
        status: patch.status ?? current.status,
      },
    });
    await actions.reloadPipeline();
  },
  setActivityStatus: async (id, status) => {
    await setCrmActivityStatus({ data: { id, status } });
    await actions.reloadPipeline();
  },
  addLead: async (row) => {
    await upsertCrmLead({ data: row });
    await actions.reloadPipeline();
  },
  setLeadStatus: async (id, status) => {
    await setCrmLeadStatus({ data: { id, status } });
    await actions.reloadPipeline();
  },
  updateLead: async (id, patch) => {
    const current = data.leads.find((l) => l.id === id);
    if (!current) return;
    await upsertCrmLead({
      data: {
        id,
        companyName: patch.companyName ?? current.companyName,
        companyId: patch.companyId ?? current.companyId,
        line: patch.line ?? current.line,
        need: patch.need ?? current.need,
        comment: patch.comment ?? current.comment,
        ownerId: patch.ownerId ?? current.ownerId,
        author: patch.author ?? current.author,
        status: patch.status ?? current.status,
      },
    });
    await actions.reloadPipeline();
  },
  convertLead: async (id) => {
    await convertCrmLead({ data: { id } });
    await actions.reloadPipeline();
  },
  addExpense: async (row) => {
    await createCrmExpense({
      data: {
        managerId: row.managerId,
        category: row.category,
        label: row.label,
        amount: row.amount,
        at: row.at,
        companyId: row.companyId,
        opportunityId: row.opportunityId,
        activityId: row.activityId,
        receipt: row.receipt,
      },
    });
    await actions.reloadPipeline();
  },
  setExpenseApproval: async (id, approval) => {
    await setCrmExpenseApproval({ data: { id, approval } });
    await actions.reloadPipeline();
  },
  markNotificationRead: async (id) => {
    await markCrmNotificationRead({ data: { id } });
    await actions.reloadPipeline();
  },
  markAllNotificationsRead: async () => {
    await markAllCrmNotificationsRead();
    await actions.reloadPipeline();
  },
  importCompanies: async (rows) => {
    await importCrmCompanies({
      data: {
        rows: rows.map((r) => ({
          name: r.name,
          kind: r.kind,
          sector: r.sector,
          size: r.size,
          site: r.site,
          address: r.address,
          phone: r.phone,
          email: r.email,
          website: r.website,
          managerId: r.managerId,
          servicesBought: r.servicesBought,
          targetLines: r.targetLines,
          source: r.source,
          strategic: r.strategic,
          caSigned: r.caSigned,
          notes: r.notes,
        })),
      },
    });
    await actions.reloadPipeline();
  },
  setObjectiveTarget: async (id, target) => {
    await setCrmObjectiveTarget({ data: { id, target } });
    await actions.reloadPipeline();
  },
  addLibraryItem: async (row) => {
    await createCrmLibraryItem({
      data: {
        line: row.line,
        category: row.category,
        title: row.title,
        body: row.body,
        terms: row.terms,
      },
    });
    await actions.reloadPipeline();
  },
  addReferential: async (kind, label) => {
    await createCrmReferential({ data: { kind, label } });
    await actions.reloadPipeline();
  },
  setAccountPlan: async (companyId, plan) => {
    await setCrmAccountPlan({ data: { companyId, plan } });
    await actions.reloadPipeline();
  },
  toggleWeekCheck: async (id) => {
    await toggleCrmWeekCheck({ data: { id } });
    await actions.reloadPipeline();
  },
  reset: async () => {
    setManagersCache([]);
    data = createProspectionDemoSeed();
    pipelineReady = false;
    emit();
    await actions.reloadPipeline();
  },
};

export function useProspectionDemoStore<T>(selector: (s: Store) => T): T {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector({ ...snap, ...actions });
}

export function isProspectionPipelineReady() {
  return pipelineReady;
}
