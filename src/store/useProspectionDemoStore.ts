import { useSyncExternalStore } from "react";
import {
  STAGE_PROBABILITY,
  createProspectionDemoSeed,
  setManagersCache,
  type AccountPlan,
  type Activity,
  type ActivityKind,
  type ActivityStatus,
  type BudgetSettings,
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
  deleteCrmActivity,
  deleteCrmCompany,
  deleteCrmContact,
  deleteCrmExpense,
  deleteCrmLead,
  deleteCrmLibraryItem,
  deleteCrmNotification,
  deleteCrmOpportunity,
  deleteCrmReferential,
  importCrmCompanies,
  listCrmPipeline,
  markAllCrmNotificationsRead,
  markCrmNotificationRead,
  setCrmAccountPlan,
  setCrmActivityStatus,
  setCrmBudgetSettings,
  setCrmClientOverlay,
  setCrmExpenseApproval,
  setCrmLeadStatus,
  setCrmObjectiveTarget,
  toggleCrmWeekCheck,
  updateCrmCompany,
  updateCrmContact,
  updateCrmExpense,
  updateCrmLibraryItem,
  updateCrmNotification,
  updateCrmReferential,
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
  deleteCompany: (id: string) => Promise<void>;
  addContact: (row: Omit<Contact, "id">) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  updateContact: (id: string, row: Omit<Contact, "id">) => Promise<void>;
  addOpportunity: (row: Omit<Opportunity, "id">) => Promise<string>;
  updateOpportunity: (id: string, patch: Partial<Opportunity>) => Promise<void>;
  deleteOpportunity: (id: string) => Promise<void>;
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
  deleteActivity: (id: string) => Promise<void>;
  addLead: (row: Omit<Lead, "id" | "at" | "status"> & { status?: LeadStatus }) => Promise<void>;
  setLeadStatus: (id: string, status: LeadStatus) => Promise<void>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  convertLead: (id: string) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addExpense: (row: Omit<Expense, "id" | "approval">) => Promise<void>;
  setExpenseApproval: (id: string, approval: Expense["approval"]) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  updateExpense: (id: string, row: Omit<Expense, "id" | "approval">) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  updateNotification: (
    id: string,
    patch: { title: string; body: string; read: boolean },
  ) => Promise<void>;
  importCompanies: (rows: Company[]) => Promise<void>;
  setObjectiveTarget: (id: string, target: number) => Promise<void>;
  setBudgetSettings: (settings: BudgetSettings) => Promise<void>;
  addLibraryItem: (row: Omit<LibraryItem, "id">) => Promise<void>;
  deleteLibraryItem: (id: string) => Promise<void>;
  updateLibraryItem: (id: string, row: Omit<LibraryItem, "id">) => Promise<void>;
  addReferential: (kind: ReferentialKind, label: string) => Promise<void>;
  deleteReferential: (id: string) => Promise<void>;
  updateReferential: (id: string, kind: ReferentialKind, label: string) => Promise<void>;
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
    budgetSettings: snapshot.budgetSettings,
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

type RemovableKey =
  | "contacts"
  | "opportunities"
  | "activities"
  | "leads"
  | "expenses"
  | "notifications"
  | "libraryItems"
  | "referentials";

function patchLocal<K extends RemovableKey | "weekChecks">(
  key: K,
  id: string,
  patch: Partial<ProspectionData[K][number]>,
) {
  const list = data[key] as { id: string }[];
  if (!list.some((row) => row.id === id)) return;
  data = {
    ...data,
    [key]: list.map((row) => (row.id === id ? { ...row, ...patch } : row)),
  };
  emit();
}

function removeLocal(key: RemovableKey, id: string) {
  const list = data[key] as { id: string }[];
  if (!list.some((row) => row.id === id)) return;
  data = { ...data, [key]: list.filter((row) => row.id !== id) };
  emit();
}

let reloadSeq = 0;
let reloadInFlight: Promise<void> | null = null;
let reloadQueued = false;

/** Resynchronise en arrière-plan ; les appels rapprochés sont regroupés en un seul rechargement. */
function scheduleReload() {
  if (reloadInFlight) {
    reloadQueued = true;
    return;
  }
  reloadInFlight = actions
    .reloadPipeline()
    .catch((err) => console.error("Rechargement CRM impossible", err))
    .finally(() => {
      reloadInFlight = null;
      if (reloadQueued) {
        reloadQueued = false;
        scheduleReload();
      }
    });
}

const actions: Actions = {
  hydratePipeline: (snapshot) => {
    applyPipelineSnapshot(snapshot);
  },
  reloadPipeline: async () => {
    const seq = ++reloadSeq;
    const snapshot = await listCrmPipeline();
    if (seq !== reloadSeq) return;
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
      scheduleReload();
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
    scheduleReload();
  },
  setClientOverlay: async (id, patch) => {
    await setCrmClientOverlay({ data: { clientId: id, ...patch } });
    scheduleReload();
  },
  convertProspect: async (id) => {
    const converted = await convertCrmProspect({ data: { id } });
    await actions.reloadPipeline();
    return converted;
  },
  deleteCompany: async (id) => {
    await deleteCrmCompany({ data: { id } });
    scheduleReload();
  },
  addContact: async (row) => {
    await createCrmContact({ data: row });
    scheduleReload();
  },
  deleteContact: async (id) => {
    removeLocal("contacts", id);
    await deleteCrmContact({ data: { id } });
    scheduleReload();
  },
  updateContact: async (id, row) => {
    patchLocal("contacts", id, row);
    await updateCrmContact({ data: { id, ...row } });
    scheduleReload();
  },
  addOpportunity: async (row) => {
    const created = await upsertCrmOpportunity({ data: row });
    scheduleReload();
    return created.id;
  },
  updateOpportunity: async (id, patch) => {
    const current = data.opportunities.find((o) => o.id === id);
    if (!current) return;
    patchLocal("opportunities", id, patch);
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
    scheduleReload();
  },
  setStage: async (id, stage, extra) => {
    const current = data.opportunities.find((o) => o.id === id);
    if (!current) return;
    patchLocal("opportunities", id, {
      stage,
      probability: STAGE_PROBABILITY[stage] ?? current.probability,
      ...extra,
    });
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
    scheduleReload();
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
    scheduleReload();
  },
  addActivity: async (row) => {
    await upsertCrmActivity({ data: row });
    scheduleReload();
  },
  updateActivity: async (id, patch) => {
    const current = data.activities.find((a) => a.id === id);
    if (!current) return;
    patchLocal("activities", id, patch);
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
    scheduleReload();
  },
  setActivityStatus: async (id, status) => {
    patchLocal("activities", id, { status });
    await setCrmActivityStatus({ data: { id, status } });
    scheduleReload();
  },
  deleteActivity: async (id) => {
    removeLocal("activities", id);
    await deleteCrmActivity({ data: { id } });
    scheduleReload();
  },
  deleteOpportunity: async (id) => {
    removeLocal("opportunities", id);
    await deleteCrmOpportunity({ data: { id } });
    scheduleReload();
  },
  deleteLead: async (id) => {
    removeLocal("leads", id);
    await deleteCrmLead({ data: { id } });
    scheduleReload();
  },
  deleteExpense: async (id) => {
    removeLocal("expenses", id);
    await deleteCrmExpense({ data: { id } });
    scheduleReload();
  },
  updateExpense: async (id, row) => {
    patchLocal("expenses", id, row);
    await updateCrmExpense({
      data: {
        id,
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
    scheduleReload();
  },
  addLead: async (row) => {
    await upsertCrmLead({ data: row });
    scheduleReload();
  },
  setLeadStatus: async (id, status) => {
    patchLocal("leads", id, { status });
    await setCrmLeadStatus({ data: { id, status } });
    scheduleReload();
  },
  updateLead: async (id, patch) => {
    const current = data.leads.find((l) => l.id === id);
    if (!current) return;
    patchLocal("leads", id, patch);
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
    scheduleReload();
  },
  convertLead: async (id) => {
    await convertCrmLead({ data: { id } });
    scheduleReload();
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
    scheduleReload();
  },
  setExpenseApproval: async (id, approval) => {
    patchLocal("expenses", id, { approval });
    await setCrmExpenseApproval({ data: { id, approval } });
    scheduleReload();
  },
  markNotificationRead: async (id) => {
    patchLocal("notifications", id, { read: true });
    await markCrmNotificationRead({ data: { id } });
    scheduleReload();
  },
  markAllNotificationsRead: async () => {
    data = { ...data, notifications: data.notifications.map((n) => ({ ...n, read: true })) };
    emit();
    await markAllCrmNotificationsRead();
    scheduleReload();
  },
  deleteNotification: async (id) => {
    removeLocal("notifications", id);
    await deleteCrmNotification({ data: { id } });
    scheduleReload();
  },
  updateNotification: async (id, patch) => {
    patchLocal("notifications", id, patch);
    await updateCrmNotification({ data: { id, ...patch } });
    scheduleReload();
  },
  setBudgetSettings: async (settings) => {
    await setCrmBudgetSettings({ data: settings });
    scheduleReload();
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
    scheduleReload();
  },
  setObjectiveTarget: async (id, target) => {
    await setCrmObjectiveTarget({ data: { id, target } });
    scheduleReload();
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
    scheduleReload();
  },
  deleteLibraryItem: async (id) => {
    removeLocal("libraryItems", id);
    await deleteCrmLibraryItem({ data: { id } });
    scheduleReload();
  },
  updateLibraryItem: async (id, row) => {
    patchLocal("libraryItems", id, row);
    await updateCrmLibraryItem({
      data: {
        id,
        line: row.line,
        category: row.category,
        title: row.title,
        body: row.body,
        terms: row.terms,
      },
    });
    scheduleReload();
  },
  addReferential: async (kind, label) => {
    await createCrmReferential({ data: { kind, label } });
    scheduleReload();
  },
  deleteReferential: async (id) => {
    removeLocal("referentials", id);
    await deleteCrmReferential({ data: { id } });
    scheduleReload();
  },
  updateReferential: async (id, kind, label) => {
    patchLocal("referentials", id, { kind, label });
    await updateCrmReferential({ data: { id, kind, label } });
    scheduleReload();
  },
  setAccountPlan: async (companyId, plan) => {
    await setCrmAccountPlan({ data: { companyId, plan } });
    scheduleReload();
  },
  toggleWeekCheck: async (id) => {
    const check = data.weekChecks.find((w) => w.id === id);
    if (check) patchLocal("weekChecks", id, { done: !check.done });
    await toggleCrmWeekCheck({ data: { id } });
    scheduleReload();
  },
  reset: async () => {
    setManagersCache([]);
    data = createProspectionDemoSeed();
    pipelineReady = false;
    emit();
    await actions.reloadPipeline();
  },
};

/** Un échec serveur après mise à jour optimiste : on resynchronise avant de propager l’erreur. */
const exposedActions = Object.fromEntries(
  Object.entries(actions).map(([name, fn]) => [
    name,
    name === "hydratePipeline" || name === "reloadPipeline"
      ? fn
      : async (...args: unknown[]) => {
          try {
            return await (fn as (...a: unknown[]) => Promise<unknown>)(...args);
          } catch (err) {
            scheduleReload();
            throw err;
          }
        },
  ]),
) as Actions;

export function useProspectionDemoStore<T>(selector: (s: Store) => T): T {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector({ ...snap, ...exposedActions });
}

export function isProspectionPipelineReady() {
  return pipelineReady;
}
