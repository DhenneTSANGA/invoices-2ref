import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Prisma, type CrmPipelineStage, type CrmServiceLine } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, type AppSession } from "@/lib/session.functions";
import { canAccessSpace } from "@/lib/app-space";
import type { ClientPole } from "@/lib/client-pole";
import { mapStaff } from "@/lib/mappers";
import {
  isProspectionAssignableStaff,
  staffToCrmManager,
} from "@/lib/prospection-managers";
import {
  assertProspectionStaff,
  canAdminReferentials,
  canApproveExpenses,
  canEditLibrary,
  canWriteCrm,
  crmRoleFromStaff,
  type CrmRole,
} from "@/lib/prospection-access";
import { resolveLeadOwner } from "@/lib/crm-lead-routing";
import { currentCrmMonth } from "@/lib/crm-month";
import { computeTeamPulse } from "@/lib/crm-team-pulse";
import {
  createReceiptSignedUrl,
  uploadCrmReceiptFile,
} from "@/lib/crm-receipts-storage";
import { resolveCabinet } from "@/lib/roles";
import {
  DEFAULT_BUDGET_SETTINGS,
  STAGE_LABELS,
  STAGE_PROBABILITY,
  type ActivityKind,
  type ActivityStatus,
  type BudgetSettings,
  type Company,
  type CompanyKind,
  type LeadStatus,
  type Manager,
  type OpportunitySource,
  type PipelineStage,
  portfolioManagers,
  type ServiceLine,
  type Site,
} from "@/lib/prospection-model";
import { HELP_LIBRARY } from "@/lib/prospection-library";
import {
  DEFAULT_OBJECTIVE_TARGETS,
  mapCrmActivity,
  mapCrmCompany,
  mapCrmContact,
  mapCrmExpense,
  mapCrmLead,
  mapCrmLibraryItem,
  mapCrmNotification,
  mapCrmObjective,
  mapCrmOpportunity,
  mapCrmReferential,
  overlayFromCrmCompany,
  toDateInput,
  type CrmPipelineSnapshot,
} from "@/lib/prospection-db";

async function requireSession(): Promise<NonNullable<AppSession>> {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  if (!canAccessSpace(session.staff, "prospection")) {
    throw new Error("Accès Prospection non autorisé");
  }
  assertProspectionStaff(session.staff.role);
  return session;
}

type CrmContext = {
  session: NonNullable<AppSession>;
  staff: NonNullable<AppSession>["staff"];
  crm: CrmRole;
  lines: ServiceLine[];
};

/** Session Prospection + profil CRM (cahier des charges §3). */
async function requireCrm(): Promise<CrmContext> {
  const session = await requireSession();
  return {
    session,
    staff: session.staff,
    crm: crmRoleFromStaff(session.staff),
    lines: session.staff.crmLines ?? [],
  };
}

function assertCrmWriter(ctx: CrmContext) {
  if (!canWriteCrm(ctx.crm)) {
    throw new Error(
      "Votre profil Prospection est en lecture seule — vous pouvez uniquement signaler des pistes.",
    );
  }
}

function assertCrmAllowed(allowed: boolean, message: string) {
  if (!allowed) throw new Error(message);
}

/** Un manager n’écrit que sur son portefeuille (élément non attribué toléré). */
function assertOwned(ctx: CrmContext, ownerId: string | null | undefined) {
  if (ctx.crm !== "manager") return;
  if (ownerId && ownerId !== ctx.staff.id) {
    throw new Error("Accès refusé : cet élément appartient au portefeuille d’un autre manager.");
  }
}

/** Propriétaire effectif : un manager s’attribue toujours ses saisies. */
function ownerFor(ctx: CrmContext, requested?: string | null): string {
  if (ctx.crm === "manager") return ctx.staff.id;
  return requested?.trim() || ctx.staff.id;
}

async function assertCompanyOwned(ctx: CrmContext, uiId: string) {
  if (ctx.crm !== "manager") return;
  const company = await prisma.crmCompany.findFirst({
    where: { OR: [{ id: uiId }, { clientId: uiId }] },
    select: { managerId: true },
  });
  assertOwned(ctx, company?.managerId);
}

function staffFullName(staff: { firstName?: string | null; lastName?: string | null }) {
  return `${staff.firstName ?? ""} ${staff.lastName ?? ""}`.trim() || "Collaborateur";
}

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const PROPOSAL_STAGES: CrmPipelineStage[] = ["proposition", "negotiation", "decision", "gagne"];

/** Dates de passage en qualification / proposition / signature, posées une seule fois. */
function stageMilestones(
  stage: CrmPipelineStage,
  current?: { qualifiedAt: Date | null; proposalAt: Date | null; wonAt: Date | null } | null,
) {
  const now = new Date();
  return {
    ...(stage !== "identification" && !current?.qualifiedAt ? { qualifiedAt: now } : {}),
    ...(PROPOSAL_STAGES.includes(stage) && !current?.proposalAt ? { proposalAt: now } : {}),
    ...(stage === "gagne" && !current?.wonAt ? { wonAt: now } : {}),
  };
}

/** Un prospect qui refuse ou reporte n’est jamais supprimé : relance à 3 mois (§4). */
function reviveDefault(stage: CrmPipelineStage, reviveOn?: string | null): Date | undefined {
  if (reviveOn?.trim()) return toDateInput(reviveOn);
  if (stage !== "perdu" && stage !== "reporte") return undefined;
  return toDateInput(new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10));
}

function cityFromCrmSite(site: Site): string {
  if (site === "port_gentil") return "Port-Gentil";
  if (site === "franceville") return "Franceville";
  return "Libreville";
}

function poleFromCrmLines(lines: readonly string[]): ClientPole {
  if (lines.includes("formation")) return "formation";
  if (lines.includes("comptabilite")) return "comptabilite";
  if (
    lines.includes("conseil") ||
    lines.includes("fiscalite") ||
    lines.includes("rh")
  ) {
    return "audit";
  }
  return "formation";
}

const serviceLineSchema = z.enum([
  "rh",
  "comptabilite",
  "conseil",
  "fiscalite",
  "formation",
]);
const siteSchema = z.enum(["libreville", "port_gentil", "franceville"]);
const sourceSchema = z.enum([
  "nouveau",
  "client_existant",
  "client_formation",
  "piste_interne",
]);
const stageSchema = z.enum([
  "identification",
  "qualification",
  "premier_contact",
  "rendez_vous",
  "proposition",
  "negotiation",
  "decision",
  "gagne",
  "perdu",
  "reporte",
]);
const activityKindSchema = z.enum(["appel", "email", "visite", "rdv", "evenement"]);
const activityStatusSchema = z.enum([
  "a_faire",
  "planifiee",
  "en_cours",
  "terminee",
  "annulee",
  "en_retard",
]);
const leadStatusSchema = z.enum([
  "nouvelle",
  "en_cours",
  "qualifiee",
  "convertie",
  "rejetee",
  "reportee",
]);
const influenceSchema = z.enum(["faible", "moyen", "fort"]);
const companyKindSchema = z.enum(["prospect", "client"]);

const accountPlanObjectSchema = z.object({
  stakes: z.string(),
  objectives: z.string(),
  decisionMakers: z.string(),
  influencers: z.string(),
  detectedNeeds: z.string(),
  risks: z.string(),
  feePotential: z.number(),
  nextMoves: z.string(),
  strategy: z.string(),
});
const accountPlanSchema = accountPlanObjectSchema.optional();

/**
 * Résout un id UI (crm id ou client Facturation) vers une fiche CrmCompany.
 * Crée un enrichissement CRM si l’id pointe vers un client Facturation inconnu du CRM.
 */
async function resolveCrmCompanyId(uiId: string, staffId?: string): Promise<string> {
  const byId = await prisma.crmCompany.findUnique({ where: { id: uiId } });
  if (byId) return byId.id;

  const byClient = await prisma.crmCompany.findUnique({ where: { clientId: uiId } });
  if (byClient) return byClient.id;

  const client = await prisma.client.findUnique({ where: { id: uiId } });
  if (!client) throw new Error("Entreprise introuvable");

  const created = await prisma.crmCompany.create({
    data: {
      clientId: client.id,
      name: client.name,
      kind: "client",
      sector: client.activity || "",
      size: "—",
      site: "libreville",
      address: [client.address, client.city].filter(Boolean).join(", "),
      phone: client.phone || "",
      email: client.email || "",
      source: "client_existant",
      createdById: staffId ?? null,
    },
  });
  return created.id;
}

async function loadCrmManagers(): Promise<Manager[]> {
  const rows = await prisma.staffMember.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const staff = rows.map(mapStaff);
  return staff
    .filter(
      (s) =>
        isProspectionAssignableStaff(s) &&
        (s.role === "admin" || s.role === "super_admin"),
    )
    .map(staffToCrmManager);
}

/**
 * Objectifs mensuels par manager : crée ceux du mois manquants en reprenant
 * la cible du dernier mois saisi (sinon la cible par défaut).
 */
async function ensureObjectivesForManagers(managers: Manager[], month = currentCrmMonth()) {
  if (managers.length === 0) return;
  const existing = await prisma.crmObjective.findMany({
    where: { managerId: { in: managers.map((m) => m.id) }, month: { lte: month } },
    select: { managerId: true, metric: true, month: true, target: true },
    orderBy: { month: "desc" },
  });
  const have = new Set(
    existing.filter((o) => o.month === month).map((o) => `${o.managerId}:${o.metric}`),
  );
  const lastTarget = new Map<string, number>();
  for (const o of existing) {
    const key = `${o.managerId}:${o.metric}`;
    if (!lastTarget.has(key)) lastTarget.set(key, o.target);
  }
  const missing = managers.flatMap((m) =>
    DEFAULT_OBJECTIVE_TARGETS.filter((t) => !have.has(`${m.id}:${t.metric}`)).map(
      (t) => ({
        managerId: m.id,
        metric: t.metric,
        month,
        target: lastTarget.get(`${m.id}:${t.metric}`) ?? t.target,
      }),
    ),
  );
  if (missing.length > 0) {
    await prisma.crmObjective.createMany({ data: missing, skipDuplicates: true });
  }
}

async function ensureBudgetSettings(): Promise<BudgetSettings> {
  const row = await prisma.crmBudgetSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      monthlyBudgetPerManager: DEFAULT_BUDGET_SETTINGS.monthlyBudgetPerManager,
      alertRatio: DEFAULT_BUDGET_SETTINGS.alertRatio,
      approvalThreshold: DEFAULT_BUDGET_SETTINGS.approvalThreshold,
    },
    update: {},
  });
  return {
    monthlyBudgetPerManager: Number(row.monthlyBudgetPerManager),
    alertRatio: row.alertRatio,
    approvalThreshold: Number(row.approvalThreshold),
  };
}

async function ensureLibrarySeed() {
  const count = await prisma.crmLibraryItem.count();
  if (count > 0) return;
  await prisma.crmLibraryItem.createMany({
    data: HELP_LIBRARY.map((item) => ({
      line: item.line,
      category: item.category,
      title: item.title,
      body: item.body,
      terms: item.terms ?? undefined,
    })),
  });
}

async function ensureCrmDefaults(managers: Manager[]) {
  await Promise.all([
    // Objectifs : uniquement les porteurs de portefeuille (pas la direction).
    ensureObjectivesForManagers(portfolioManagers(managers)),
    ensureBudgetSettings(),
    ensureLibrarySeed(),
  ]);
}

/** Valeurs par défaut déjà créées pour cet ensemble de managers (par process serveur). */
let crmDefaultsSignature: string | null = null;

async function readBudgetSettings(): Promise<BudgetSettings> {
  const row = await prisma.crmBudgetSettings.findUnique({ where: { id: "default" } });
  if (!row) return { ...DEFAULT_BUDGET_SETTINGS };
  return {
    monthlyBudgetPerManager: Number(row.monthlyBudgetPerManager),
    alertRatio: row.alertRatio,
    approvalThreshold: Number(row.approvalThreshold),
  };
}

/** Direction (super admins + profils direction) : validations, alertes budget. */
async function loadDirectionIds(): Promise<string[]> {
  const rows = await prisma.staffMember.findMany({
    where: {
      OR: [{ role: "super_admin" }, { role: "admin", crmProfile: "direction" }],
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Alerte au manager et à la direction au franchissement du seuil (80 % par défaut). */
async function notifyBudgetThreshold(managerId: string, at: Date, addedAmount: number) {
  const budget = await readBudgetSettings();
  const month = at.toISOString().slice(0, 7);
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const agg = await prisma.crmExpense.aggregate({
    where: { managerId, at: { gte: start, lt: end }, approval: { not: "rejected" } },
    _sum: { amount: true },
  });
  const spent = Number(agg._sum.amount ?? 0);
  const limit = budget.monthlyBudgetPerManager * budget.alertRatio;
  if (spent < limit || spent - addedAmount >= limit) return;
  const manager = await prisma.staffMember.findUnique({
    where: { id: managerId },
    select: { firstName: true, lastName: true },
  });
  const pct = Math.round((spent / budget.monthlyBudgetPerManager) * 100);
  await notifyCrmStaff(
    `Budget consommé à ${pct} %`,
    `${manager ? staffFullName(manager) : "Manager"} — ${spent.toLocaleString("fr-FR")} FCFA sur ${budget.monthlyBudgetPerManager.toLocaleString("fr-FR")} FCFA (${month}).`,
    "/prospection/budget",
    [managerId, ...(await loadDirectionIds())],
  );
}

/**
 * Notifie les personnes concernées par un événement, jamais son auteur ;
 * ne fait rien si personne n’est concerné (pas de diffusion à tous).
 */
async function notifyConcerned(
  ctx: CrmContext,
  title: string,
  body: string,
  href: string,
  staffIds: (string | null | undefined)[],
) {
  const ids = [...new Set(staffIds.filter((id): id is string => Boolean(id)))].filter(
    (id) => id !== ctx.staff.id,
  );
  if (ids.length > 0) await notifyCrmStaff(title, body, href, ids);
}

/** Notifie les collaborateurs indiqués (aucune diffusion implicite à tous). */
async function notifyCrmStaff(title: string, body: string, href: string, staffIds: string[]) {
  const ids = [...new Set(staffIds.filter(Boolean))];
  if (ids.length === 0) return;
  const at = new Date();
  await prisma.crmNotification.createMany({
    data: ids.map((staffId) => ({ title, body, href, staffId, at })),
  });
}

async function loadPipelineSnapshot(ctx: CrmContext): Promise<CrmPipelineSnapshot> {
  const sessionStaffId = ctx.staff.id;
  const managersPromise = loadCrmManagers();
  if (crmDefaultsSignature === null) {
    const managers = await managersPromise;
    await ensureCrmDefaults(managers);
    crmDefaultsSignature = managerSignature(managers);
    return readPipelineData(ctx, managers);
  }

  const [managers, snapshot] = await Promise.all([
    managersPromise,
    readPipelineData(ctx, []),
  ]);
  const signature = managerSignature(managers);
  if (signature !== crmDefaultsSignature) {
    await ensureCrmDefaults(managers);
    crmDefaultsSignature = signature;
    return readPipelineData(ctx, managers);
  }
  return { ...snapshot, managers };
}

function managerSignature(managers: Manager[]) {
  // Le mois fait partie de la signature : les objectifs du nouveau mois sont créés au 1er.
  return `${currentCrmMonth()}|${managers
    .map((m) => m.id)
    .sort()
    .join(",")}`;
}

async function readPipelineData(
  ctx: CrmContext,
  managers: Manager[],
): Promise<CrmPipelineSnapshot> {
  const sessionStaffId = ctx.staff.id;
  const [
    budgetSettings,
    companies,
    contacts,
    opportunities,
    activities,
    leads,
    expenses,
    objectives,
    notifications,
    libraryItems,
    referentials,
  ] = await Promise.all([
    readBudgetSettings(),
    prisma.crmCompany.findMany({ orderBy: { name: "asc" } }),
    prisma.crmContact.findMany({
      include: { company: { select: { id: true, clientId: true } } },
      orderBy: { lastName: "asc" },
    }),
    prisma.crmOpportunity.findMany({
      include: { company: { select: { id: true, clientId: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.crmActivity.findMany({
      include: { company: { select: { id: true, clientId: true } } },
      orderBy: [{ at: "desc" }, { createdAt: "desc" }],
    }),
    prisma.crmLead.findMany({
      include: { company: { select: { id: true, clientId: true } } },
      orderBy: { at: "desc" },
    }),
    prisma.crmExpense.findMany({
      include: { company: { select: { id: true, clientId: true } } },
      orderBy: [{ at: "desc" }, { createdAt: "desc" }],
    }),
    prisma.crmObjective.findMany({
      orderBy: [{ month: "asc" }, { managerId: "asc" }, { metric: "asc" }],
    }),
    prisma.crmNotification.findMany({
      where: { staffId: sessionStaffId },
      orderBy: { at: "desc" },
      take: 200,
    }),
    prisma.crmLibraryItem.findMany({ orderBy: [{ line: "asc" }, { category: "asc" }, { title: "asc" }] }),
    prisma.crmReferential.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const scoped = scopeCrmRows(ctx, {
    companies,
    contacts,
    opportunities,
    activities,
    leads,
    expenses,
    objectives,
  });

  const localCompanies = scoped.companies.filter((c) => !c.clientId).map(mapCrmCompany);
  const clientOverlays: CrmPipelineSnapshot["clientOverlays"] = {};
  for (const c of scoped.companies) {
    if (c.clientId) clientOverlays[c.clientId] = overlayFromCrmCompany(c);
  }

  return {
    companies: localCompanies,
    clientOverlays,
    managers,
    budgetSettings,
    contacts: scoped.contacts.map((c) => mapCrmContact(c, c.company)),
    opportunities: scoped.opportunities.map((o) => mapCrmOpportunity(o, o.company)),
    activities: scoped.activities.map((a) => mapCrmActivity(a, a.company)),
    leads: scoped.leads.map((l) => mapCrmLead(l, l.company)),
    expenses: scoped.expenses.map((e) => mapCrmExpense(e, e.company)),
    objectives: scoped.objectives.map(mapCrmObjective),
    notifications: notifications.map(mapCrmNotification),
    libraryItems: libraryItems.map(mapCrmLibraryItem),
    referentials: referentials.map(mapCrmReferential),
  };
}

/**
 * Lecture selon le profil (§3) :
 * - direction / administrateur : tout ;
 * - manager : son portefeuille (fiches attribuées ou non attribuées, ses opportunités,
 *   actions, pistes, dépenses et objectifs) ;
 * - chef de service : opportunités de ses lignes et les pistes qu’il a signalées.
 */
function scopeCrmRows<
  C extends { id: string; managerId: string },
  K extends { companyId: string },
  O extends { id: string; companyId: string; ownerId: string; line: CrmServiceLine },
  A extends { companyId: string; ownerId: string; opportunityId: string | null },
  L extends {
    ownerId: string;
    authorId: string | null;
    line: CrmServiceLine;
    companyId: string | null;
  },
  E extends { managerId: string },
  B extends { managerId: string },
>(
  ctx: CrmContext,
  rows: {
    companies: C[];
    contacts: K[];
    opportunities: O[];
    activities: A[];
    leads: L[];
    expenses: E[];
    objectives: B[];
  },
) {
  if (ctx.crm !== "manager" && ctx.crm !== "chef_service") return rows;
  const self = ctx.staff.id;

  if (ctx.crm === "manager") {
    const opportunities = rows.opportunities.filter((o) => o.ownerId === self);
    const activities = rows.activities.filter((a) => a.ownerId === self);
    const leads = rows.leads.filter((l) => l.ownerId === self || l.authorId === self);
    const visible = new Set<string>([
      ...rows.companies.filter((c) => !c.managerId || c.managerId === self).map((c) => c.id),
      ...opportunities.map((o) => o.companyId),
      ...activities.map((a) => a.companyId),
    ]);
    return {
      companies: rows.companies.filter((c) => visible.has(c.id)),
      contacts: rows.contacts.filter((c) => visible.has(c.companyId)),
      opportunities,
      activities,
      leads,
      expenses: rows.expenses.filter((e) => e.managerId === self),
      objectives: rows.objectives.filter((o) => o.managerId === self),
    };
  }

  const lines = new Set<CrmServiceLine>(ctx.lines as CrmServiceLine[]);
  const opportunities = rows.opportunities.filter((o) => lines.has(o.line));
  const oppIds = new Set(opportunities.map((o) => o.id));
  const leads = rows.leads.filter((l) => l.authorId === self || lines.has(l.line));
  const visible = new Set<string>([
    ...opportunities.map((o) => o.companyId),
    ...leads.flatMap((l) => (l.companyId ? [l.companyId] : [])),
  ]);
  return {
    companies: rows.companies.filter((c) => visible.has(c.id)),
    contacts: rows.contacts.filter((c) => visible.has(c.companyId)),
    opportunities,
    activities: rows.activities.filter(
      (a) => a.opportunityId != null && oppIds.has(a.opportunityId),
    ),
    leads,
    expenses: [] as E[],
    objectives: [] as B[],
  };
}

export const listCrmPipeline = createServerFn({ method: "GET" }).handler(async () => {
  const ctx = await requireCrm();
  return loadPipelineSnapshot(ctx);
});

const companyInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  kind: companyKindSchema.optional(),
  sector: z.string().optional(),
  size: z.string().optional(),
  site: siteSchema.optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  managerId: z.string().optional(),
  servicesBought: z.array(serviceLineSchema).optional(),
  targetLines: z.array(serviceLineSchema).optional(),
  source: sourceSchema.optional(),
  strategic: z.boolean().optional(),
  caSigned: z.number().optional(),
  notes: z.string().optional(),
  plan: accountPlanSchema,
  clientId: z.string().nullable().optional(),
});

export const upsertCrmCompany = createServerFn({ method: "POST" })
  .validator(companyInputSchema)
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const { staff } = ctx;
    const payload = {
      name: data.name.trim(),
      kind: (data.kind ?? "prospect") as CompanyKind,
      sector: data.sector ?? "",
      size: data.size ?? "",
      site: (data.site ?? "libreville") as Site,
      address: data.address ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      website: data.website ?? "",
      managerId: ownerFor(ctx, data.managerId),
      servicesBought: (data.servicesBought ?? []) as CrmServiceLine[],
      targetLines: (data.targetLines ?? []) as CrmServiceLine[],
      source: (data.source ?? "nouveau") as OpportunitySource,
      strategic: data.strategic ?? false,
      caSigned: data.caSigned ?? 0,
      notes: data.notes ?? "",
      plan: data.plan ?? undefined,
      clientId: data.clientId === undefined ? undefined : data.clientId,
      createdById: staff.id,
    };

    if (data.id) {
      const existing = await prisma.crmCompany.findFirst({
        where: {
          OR: [{ id: data.id }, { clientId: data.id }],
        },
      });
      if (existing) {
        assertOwned(ctx, existing.managerId);
        const row = await prisma.crmCompany.update({
          where: { id: existing.id },
          data: {
            name: payload.name,
            kind: payload.kind,
            sector: payload.sector,
            size: payload.size,
            site: payload.site,
            address: payload.address,
            phone: payload.phone,
            email: payload.email,
            website: payload.website,
            managerId: payload.managerId,
            servicesBought: payload.servicesBought,
            targetLines: payload.targetLines,
            source: payload.source,
            strategic: payload.strategic,
            caSigned: payload.caSigned,
            notes: payload.notes,
            plan: payload.plan ?? undefined,
          },
        });
        return mapCrmCompany(row);
      }
    }

    const row = await prisma.crmCompany.create({
      data: {
        ...payload,
        clientId: payload.clientId ?? null,
      },
    });
    return mapCrmCompany(row);
  });

export const updateCrmCompany = createServerFn({ method: "POST" })
  .validator(companyInputSchema.extend({ id: z.string() }).partial().required({ id: true }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const existing = await prisma.crmCompany.findFirst({
      where: { OR: [{ id: data.id }, { clientId: data.id }] },
    });
    if (!existing) throw new Error("Entreprise introuvable");
    assertOwned(ctx, existing.managerId);

    const row = await prisma.crmCompany.update({
      where: { id: existing.id },
      data: {
        ...(data.name != null ? { name: data.name.trim() } : {}),
        ...(data.kind != null ? { kind: data.kind } : {}),
        ...(data.sector != null ? { sector: data.sector } : {}),
        ...(data.size != null ? { size: data.size } : {}),
        ...(data.site != null ? { site: data.site } : {}),
        ...(data.address != null ? { address: data.address } : {}),
        ...(data.phone != null ? { phone: data.phone } : {}),
        ...(data.email != null ? { email: data.email } : {}),
        ...(data.website != null ? { website: data.website } : {}),
        ...(data.managerId != null ? { managerId: ownerFor(ctx, data.managerId) } : {}),
        ...(data.servicesBought != null
          ? { servicesBought: data.servicesBought as CrmServiceLine[] }
          : {}),
        ...(data.targetLines != null
          ? { targetLines: data.targetLines as CrmServiceLine[] }
          : {}),
        ...(data.source != null ? { source: data.source } : {}),
        ...(data.strategic != null ? { strategic: data.strategic } : {}),
        ...(data.caSigned != null ? { caSigned: data.caSigned } : {}),
        ...(data.notes != null ? { notes: data.notes } : {}),
        ...(data.plan !== undefined ? { plan: data.plan ?? null } : {}),
      },
    });
    return mapCrmCompany(row);
  });

/** Enrichissement CRM d’un client Facturation (overlay). */
export const setCrmClientOverlay = createServerFn({ method: "POST" })
  .validator(
    z.object({
      clientId: z.string(),
      strategic: z.boolean().optional(),
      managerId: z.string().optional(),
      servicesBought: z.array(serviceLineSchema).optional(),
      targetLines: z.array(serviceLineSchema).optional(),
      caSigned: z.number().optional(),
      notes: z.string().optional(),
      site: siteSchema.optional(),
      sector: z.string().optional(),
      size: z.string().optional(),
      plan: accountPlanSchema.nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    await assertCompanyOwned(ctx, data.clientId);
    const { staff } = ctx;
    const crmId = await resolveCrmCompanyId(data.clientId, staff.id);
    const row = await prisma.crmCompany.update({
      where: { id: crmId },
      data: {
        ...(data.strategic != null ? { strategic: data.strategic } : {}),
        ...(data.managerId != null ? { managerId: ownerFor(ctx, data.managerId) } : {}),
        ...(data.servicesBought != null
          ? { servicesBought: data.servicesBought as CrmServiceLine[] }
          : {}),
        ...(data.targetLines != null
          ? { targetLines: data.targetLines as CrmServiceLine[] }
          : {}),
        ...(data.caSigned != null ? { caSigned: data.caSigned } : {}),
        ...(data.notes != null ? { notes: data.notes } : {}),
        ...(data.site != null ? { site: data.site } : {}),
        ...(data.sector != null ? { sector: data.sector } : {}),
        ...(data.size != null ? { size: data.size } : {}),
        ...(data.plan !== undefined
          ? { plan: data.plan === null ? Prisma.JsonNull : data.plan }
          : {}),
      },
    });
    return { clientId: data.clientId, overlay: overlayFromCrmCompany(row) };
  });

export const convertCrmProspect = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      /** La Prospection couvre les deux cabinets : le client Facturation est créé dans celui choisi. */
      cabinet: z.enum(["conseil", "expertise_fiscale"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const { staff, activeCabinet } = ctx.session;
    const existing = await prisma.crmCompany.findFirst({
      where: { OR: [{ id: data.id }, { clientId: data.id }] },
    });
    if (!existing) throw new Error("Prospect introuvable");
    assertOwned(ctx, existing.managerId);

    if (existing.clientId) {
      const row = await prisma.crmCompany.update({
        where: { id: existing.id },
        data: { kind: "client" },
      });
      return mapCrmCompany(row);
    }

    const cabinet = data.cabinet ?? resolveCabinet(staff.role, staff.cabinet, activeCabinet);
    // Pôle de la fiche client Facturation (attribut du client), déduit des lignes de service.
    const pole = poleFromCrmLines([...existing.servicesBought, ...existing.targetLines]);

    const row = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          name: existing.name.trim(),
          sigle: "",
          legalForm: "—",
          shareCapital: "",
          clientRef: "",
          nif: "",
          niu: "",
          rccm: "",
          cnss: "",
          cnamgs: "",
          activity: existing.sector || "",
          activityDetail: existing.notes || "",
          contactName: existing.name.trim(),
          representativeTitle: "",
          email: existing.email || "",
          phone: existing.phone || "",
          address: existing.address || "",
          bp: "",
          city: cityFromCrmSite(existing.site),
          country: "Gabon",
          anpiNumber: "",
          anpiDate: "",
          billingProfile: "one_off",
          pole,
          cabinet,
          createdById: staff.id,
        },
      });

      return tx.crmCompany.update({
        where: { id: existing.id },
        data: {
          kind: "client",
          clientId: client.id,
          servicesBought:
            existing.servicesBought.length > 0
              ? existing.servicesBought
              : existing.targetLines,
        },
      });
    });

    await notifyConcerned(
      ctx,
      "Prospect converti",
      `${row.name} est maintenant un client Facturation (portefeuille live).`,
      `/prospection/clients/${row.clientId}`,
      [row.managerId, ...(await loadDirectionIds())],
    );

    return mapCrmCompany(row);
  });

const contactInputSchema = z.object({
  companyId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  decisionMaker: z.boolean().optional(),
  influence: influenceSchema.optional(),
});

export const createCrmContact = createServerFn({ method: "POST" })
  .validator(contactInputSchema)
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    await assertCompanyOwned(ctx, data.companyId);
    const { staff } = ctx;
    const companyId = await resolveCrmCompanyId(data.companyId, staff.id);
    const row = await prisma.crmContact.create({
      data: {
        companyId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role: data.role ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        decisionMaker: data.decisionMaker ?? false,
        influence: data.influence ?? "moyen",
      },
      include: { company: { select: { id: true, clientId: true } } },
    });
    return mapCrmContact(row, row.company);
  });

export const updateCrmContact = createServerFn({ method: "POST" })
  .validator(contactInputSchema.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    await assertCompanyOwned(ctx, data.companyId);
    const { staff } = ctx;
    const companyId = await resolveCrmCompanyId(data.companyId, staff.id);
    const row = await prisma.crmContact.update({
      where: { id: data.id },
      data: {
        companyId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role: data.role ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        decisionMaker: data.decisionMaker ?? false,
        influence: data.influence ?? "moyen",
      },
      include: { company: { select: { id: true, clientId: true } } },
    });
    return mapCrmContact(row, row.company);
  });

const opportunityInputSchema = z.object({
  id: z.string().optional(),
  companyId: z.string(),
  title: z.string().min(1),
  line: serviceLineSchema,
  source: sourceSchema,
  stage: stageSchema.optional(),
  amount: z.number().optional(),
  probability: z.number().optional(),
  decisionOn: z.string().optional(),
  nextAction: z.string().optional(),
  nextActionOn: z.string().optional(),
  ownerId: z.string(),
  notes: z.string().optional(),
  lostReason: z.string().optional(),
  reviveOn: z.string().optional(),
});

export const upsertCrmOpportunity = createServerFn({ method: "POST" })
  .validator(opportunityInputSchema)
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    await assertCompanyOwned(ctx, data.companyId);
    const { staff } = ctx;
    const companyId = await resolveCrmCompanyId(data.companyId, staff.id);
    // Nouveau prospect : étape 1 (identification) ; client existant : directement étape 2 (§4).
    const stage = (data.stage ??
      (data.source === "nouveau" ? "identification" : "qualification")) as CrmPipelineStage;
    const common = {
      companyId,
      title: data.title.trim(),
      line: data.line as CrmServiceLine,
      source: data.source as OpportunitySource,
      stage,
      amount: data.amount ?? 0,
      probability: data.probability ?? STAGE_PROBABILITY[stage as PipelineStage] ?? 20,
      decisionOn: toDateInput(data.decisionOn),
      nextAction: data.nextAction ?? "",
      nextActionOn: toDateInput(data.nextActionOn),
      ownerId: ownerFor(ctx, data.ownerId),
      notes: data.notes ?? "",
      lostReason: data.lostReason ?? null,
      reviveOn: reviveDefault(stage, data.reviveOn),
    };

    if (data.id) {
      const previous = await prisma.crmOpportunity.findUnique({
        where: { id: data.id },
        select: { stage: true, ownerId: true, qualifiedAt: true, proposalAt: true, wonAt: true },
      });
      assertOwned(ctx, previous?.ownerId);
      const row = await prisma.crmOpportunity.update({
        where: { id: data.id },
        data: {
          ...common,
          ...(previous && previous.stage !== stage ? { stageChangedAt: new Date() } : {}),
          ...stageMilestones(stage, previous),
        },
        include: { company: { select: { id: true, clientId: true } } },
      });
      return mapCrmOpportunity(row, row.company);
    }

    const row = await prisma.crmOpportunity.create({
      data: { ...common, ...stageMilestones(stage) },
      include: { company: { select: { id: true, clientId: true } } },
    });
    return mapCrmOpportunity(row, row.company);
  });

export const advanceCrmOpportunity = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      stage: stageSchema,
      kind: activityKindSchema,
      title: z.string(),
      summary: z.string(),
      nextAction: z.string(),
      nextActionOn: z.string(),
      lostReason: z.string().optional(),
      reviveOn: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const current = await prisma.crmOpportunity.findUnique({
      where: { id: data.id },
      include: { company: true },
    });
    if (!current) throw new Error("Opportunité introuvable");
    assertOwned(ctx, current.ownerId);

    const stage = data.stage as CrmPipelineStage;
    // Double envoi (double clic, réseau) : l’étape est déjà appliquée — rien n’est recréé.
    if (current.stage === stage) {
      const [company, last] = await Promise.all([
        prisma.crmCompany.findUniqueOrThrow({ where: { id: current.companyId } }),
        prisma.crmActivity.findFirst({
          where: { opportunityId: current.id },
          orderBy: { createdAt: "desc" },
          include: { company: { select: { id: true, clientId: true } } },
        }),
      ]);
      return {
        opportunity: mapCrmOpportunity(current, current.company),
        activity: last ? mapCrmActivity(last, last.company) : null,
        company: mapCrmCompany(company),
      };
    }
    const probability = STAGE_PROBABILITY[stage as PipelineStage] ?? current.probability;

    const [opportunity, activity] = await prisma.$transaction(async (tx) => {
      const opp = await tx.crmOpportunity.update({
        where: { id: data.id },
        data: {
          stage,
          ...(stage !== current.stage ? { stageChangedAt: new Date() } : {}),
          probability,
          nextAction: data.nextAction,
          nextActionOn: toDateInput(data.nextActionOn),
          lostReason: data.lostReason ?? current.lostReason,
          reviveOn: reviveDefault(stage, data.reviveOn) ?? current.reviveOn,
          ...stageMilestones(stage, current),
        },
        include: { company: { select: { id: true, clientId: true } } },
      });

      if (stage === "gagne" && current.stage !== "gagne") {
        const lines = current.company.servicesBought.includes(current.line)
          ? current.company.servicesBought
          : [...current.company.servicesBought, current.line];
        await tx.crmCompany.update({
          where: { id: current.companyId },
          data: {
            caSigned: { increment: Number(current.amount) },
            servicesBought: lines,
            kind: "client",
          },
        });
      }

      const act = await tx.crmActivity.create({
        data: {
          companyId: current.companyId,
          opportunityId: current.id,
          at: toDateInput(new Date().toISOString().slice(0, 10))!,
          kind: data.kind,
          title: data.title,
          summary: data.summary,
          nextAction: data.nextAction,
          nextActionOn: toDateInput(data.nextActionOn),
          ownerId: current.ownerId,
          status: "terminee",
        },
        include: { company: { select: { id: true, clientId: true } } },
      });

      return [opp, act] as const;
    });

    const company = await prisma.crmCompany.findUniqueOrThrow({
      where: { id: current.companyId },
    });
    // Le manager de l’affaire ; la direction seulement pour une issue (gagnée / perdue).
    await notifyConcerned(
      ctx,
      `Étape : ${STAGE_LABELS[stage as PipelineStage]}`,
      `${company.name} — ${data.nextAction}`,
      "/prospection/opportunites",
      [
        current.ownerId,
        ...(stage === "gagne" || stage === "perdu" ? await loadDirectionIds() : []),
      ],
    );

    return {
      opportunity: mapCrmOpportunity(opportunity, opportunity.company),
      activity: mapCrmActivity(activity, activity.company),
      company: mapCrmCompany(company),
    };
  });

const activityInputSchema = z.object({
  id: z.string().optional(),
  companyId: z.string(),
  opportunityId: z.string().optional(),
  at: z.string(),
  time: z.string().optional(),
  kind: activityKindSchema,
  title: z.string().min(1),
  summary: z.string().optional(),
  nextAction: z.string().optional(),
  nextActionOn: z.string().optional(),
  ownerId: z.string(),
  status: activityStatusSchema.optional(),
});

export const upsertCrmActivity = createServerFn({ method: "POST" })
  .validator(activityInputSchema)
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    await assertCompanyOwned(ctx, data.companyId);
    const { staff } = ctx;
    const companyId = await resolveCrmCompanyId(data.companyId, staff.id);
    const common = {
      companyId,
      opportunityId: data.opportunityId || null,
      at: toDateInput(data.at)!,
      time: data.time || null,
      kind: data.kind as ActivityKind,
      title: data.title.trim(),
      summary: data.summary ?? "",
      nextAction: data.nextAction || null,
      nextActionOn: toDateInput(data.nextActionOn),
      ownerId: ownerFor(ctx, data.ownerId),
      status: (data.status ?? "terminee") as ActivityStatus,
    };

    if (data.id) {
      const previous = await prisma.crmActivity.findUnique({
        where: { id: data.id },
        select: { ownerId: true },
      });
      assertOwned(ctx, previous?.ownerId);
      const row = await prisma.crmActivity.update({
        where: { id: data.id },
        data: common,
        include: { company: { select: { id: true, clientId: true } } },
      });
      if (data.opportunityId && data.nextAction?.trim()) {
        await prisma.crmOpportunity.update({
          where: { id: data.opportunityId },
          data: {
            nextAction: data.nextAction.trim(),
            nextActionOn: toDateInput(data.nextActionOn) ?? undefined,
          },
        });
      }
      return mapCrmActivity(row, row.company);
    }

    const row = await prisma.crmActivity.create({
      data: common,
      include: { company: { select: { id: true, clientId: true } } },
    });
    if (data.opportunityId && data.nextAction?.trim()) {
      await prisma.crmOpportunity.update({
        where: { id: data.opportunityId },
        data: {
          nextAction: data.nextAction.trim(),
          nextActionOn: toDateInput(data.nextActionOn) ?? undefined,
        },
      });
    }
    return mapCrmActivity(row, row.company);
  });

export const setCrmActivityStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), status: activityStatusSchema }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const previous = await prisma.crmActivity.findUnique({
      where: { id: data.id },
      select: { ownerId: true },
    });
    assertOwned(ctx, previous?.ownerId);
    const row = await prisma.crmActivity.update({
      where: { id: data.id },
      data: { status: data.status },
      include: { company: { select: { id: true, clientId: true } } },
    });
    return mapCrmActivity(row, row.company);
  });

const leadInputSchema = z.object({
  id: z.string().optional(),
  companyName: z.string().min(1),
  companyId: z.string().optional(),
  line: serviceLineSchema,
  need: z.string().min(1),
  comment: z.string().optional(),
  ownerId: z.string().optional(),
  author: z.string().optional(),
  status: leadStatusSchema.optional(),
});

export const upsertCrmLead = createServerFn({ method: "POST" })
  .validator(leadInputSchema)
  .handler(async ({ data }) => {
    // Tout profil Prospection peut signaler une piste (chef de service inclus).
    const ctx = await requireCrm();
    const { staff } = ctx;
    if (data.id) {
      const previous = await prisma.crmLead.findUnique({
        where: { id: data.id },
        select: { ownerId: true, authorId: true },
      });
      if (!previous) throw new Error("Piste introuvable");
      const mine = previous.authorId === staff.id || previous.ownerId === staff.id;
      assertCrmAllowed(
        mine || ctx.crm === "direction" || ctx.crm === "admin",
        "Accès refusé : cette piste n’est pas la vôtre.",
      );
    }
    let companyId: string | null = null;
    if (data.companyId) {
      companyId = await resolveCrmCompanyId(data.companyId, staff.id);
    }
    const routed = data.ownerId?.trim()
      ? null
      : await resolveLeadOwner({
          line: data.line as CrmServiceLine,
          companyName: data.companyName,
          clientId: data.companyId,
        });
    const common = {
      companyName: data.companyName.trim(),
      companyId: companyId ?? routed?.companyId ?? null,
      line: data.line as CrmServiceLine,
      need: data.need.trim(),
      comment: data.comment ?? "",
      ownerId: data.ownerId?.trim() || routed?.ownerId || staff.id,
      status: (data.status ?? "nouvelle") as LeadStatus,
    };

    if (data.id) {
      const row = await prisma.crmLead.update({
        where: { id: data.id },
        data: common,
        include: { company: { select: { id: true, clientId: true } } },
      });
      return mapCrmLead(row, row.company);
    }

    const row = await prisma.crmLead.create({
      data: { ...common, author: staffFullName(staff), authorId: staff.id },
      include: { company: { select: { id: true, clientId: true } } },
    });
    if (row.ownerId !== staff.id) {
      await notifyCrmStaff(
        "Nouvelle piste",
        `${row.companyName} — ${row.need} (signalée par ${row.author})`,
        "/prospection/pistes",
        [row.ownerId],
      );
    }
    return mapCrmLead(row, row.company);
  });

export const setCrmLeadStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), status: leadStatusSchema }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const previous = await prisma.crmLead.findUnique({
      where: { id: data.id },
      select: { ownerId: true },
    });
    assertOwned(ctx, previous?.ownerId);
    const row = await prisma.crmLead.update({
      where: { id: data.id },
      data: { status: data.status },
      include: { company: { select: { id: true, clientId: true } } },
    });
    return mapCrmLead(row, row.company);
  });

export const convertCrmLead = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const { staff } = ctx;
    const lead = await prisma.crmLead.findUnique({ where: { id: data.id } });
    if (!lead) throw new Error("Piste introuvable");
    assertOwned(ctx, lead.ownerId);
    if (lead.status === "convertie") throw new Error("Piste déjà convertie");

    const name = lead.companyName.trim();
    let company =
      (lead.companyId
        ? await prisma.crmCompany.findUnique({ where: { id: lead.companyId } })
        : null) ??
      (await prisma.crmCompany.findFirst({
        where: { name: { equals: name, mode: "insensitive" }, clientId: null },
      }));

    if (!company) {
      company = await prisma.crmCompany.create({
        data: {
          name,
          kind: "prospect",
          sector: "À préciser",
          size: "—",
          site: "libreville",
          address: "Libreville",
          managerId: lead.ownerId,
          targetLines: [lead.line],
          source: "piste_interne",
          notes: lead.comment,
          createdById: staff.id,
        },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const opportunity = await tx.crmOpportunity.create({
        data: {
          companyId: company!.id,
          leadId: lead.id,
          title: lead.need,
          line: lead.line,
          source: "piste_interne",
          stage: "qualification",
          amount: 0,
          probability: STAGE_PROBABILITY.qualification ?? 20,
          decisionOn: toDateInput(
            new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
          ),
          nextAction: "Établir le premier contact",
          nextActionOn: toDateInput(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)),
          ownerId: lead.ownerId,
          notes: lead.comment,
        },
        include: { company: { select: { id: true, clientId: true } } },
      });

      const updatedLead = await tx.crmLead.update({
        where: { id: lead.id },
        data: { status: "convertie", companyId: company!.id },
        include: { company: { select: { id: true, clientId: true } } },
      });

      return { opportunity, lead: updatedLead, company: company! };
    });

    await notifyConcerned(
      ctx,
      "Piste convertie",
      `${result.lead.companyName} — opportunité en Qualification.`,
      "/prospection/opportunites",
      [lead.ownerId, lead.authorId],
    );

    return {
      company: mapCrmCompany(result.company),
      opportunity: mapCrmOpportunity(result.opportunity, result.opportunity.company),
      lead: mapCrmLead(result.lead, result.lead.company),
    };
  });

export const importCrmCompanies = createServerFn({ method: "POST" })
  .validator(z.object({ rows: z.array(companyInputSchema) }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const created: Company[] = [];
    // Pas de doublon : une entreprise déjà connue (CRM ou client Facturation) est ignorée.
    const [crmNames, clientNames] = await Promise.all([
      prisma.crmCompany.findMany({ select: { name: true } }),
      prisma.client.findMany({ select: { name: true } }),
    ]);
    const known = new Set(
      [...crmNames, ...clientNames].map((c) => c.name.trim().toLowerCase()),
    );
    for (const row of data.rows) {
      const key = row.name.trim().toLowerCase();
      if (!key || known.has(key)) continue;
      known.add(key);
      const company = await prisma.crmCompany.create({
        data: {
          name: row.name.trim(),
          kind: row.kind ?? "prospect",
          sector: row.sector ?? "",
          size: row.size ?? "",
          site: row.site ?? "libreville",
          address: row.address ?? "",
          phone: row.phone ?? "",
          email: row.email ?? "",
          website: row.website ?? "",
          managerId: ownerFor(ctx, row.managerId),
          servicesBought: (row.servicesBought ?? []) as CrmServiceLine[],
          targetLines: (row.targetLines ?? []) as CrmServiceLine[],
          source: row.source ?? "nouveau",
          strategic: row.strategic ?? false,
          caSigned: row.caSigned ?? 0,
          notes: row.notes ?? "",
          createdById: ctx.staff.id,
        },
      });
      created.push(mapCrmCompany(company));
    }
    return created;
  });

export const setCrmAccountPlan = createServerFn({ method: "POST" })
  .validator(
    z.object({
      companyId: z.string(),
      plan: accountPlanObjectSchema,
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    await assertCompanyOwned(ctx, data.companyId);
    const crmId = await resolveCrmCompanyId(data.companyId, ctx.staff.id);
    const row = await prisma.crmCompany.update({
      where: { id: crmId },
      data: { plan: data.plan },
    });
    return mapCrmCompany(row);
  });

const expenseCategorySchema = z.enum([
  "evenements",
  "relations",
  "communication",
  "deplacements",
  "reserve",
]);
const expenseApprovalSchema = z.enum(["none", "pending", "approved", "rejected"]);
const libraryDomainSchema = z.enum([
  "rh",
  "comptabilite",
  "conseil",
  "fiscalite",
  "formation",
  "audit",
  "juridique",
]);
/**
 * Seuls les secteurs sont extensibles : lignes, étapes, implantations et catégories
 * de dépenses sont des listes figées en base (cahier des charges).
 */
const referentialKindSchema = z
  .enum(["line", "stage", "site", "expense", "sector"])
  .refine((kind) => kind === "sector", "Seuls les secteurs sont personnalisables");

export const createCrmExpense = createServerFn({ method: "POST" })
  .validator(
    z.object({
      managerId: z.string(),
      category: expenseCategorySchema,
      label: z.string().min(1),
      amount: z.number().positive(),
      at: z.string(),
      companyId: z.string().optional(),
      opportunityId: z.string().optional(),
      activityId: z.string().optional(),
      receipt: z.boolean().optional(),
      receiptPath: z.string().optional(),
      receiptName: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const { staff } = ctx;
    const managerId = ownerFor(ctx, data.managerId);
    const receiptPath = data.receiptPath?.trim();
    if (!receiptPath || !receiptPath.startsWith(`${staff.id}/`)) {
      throw new Error("Justificatif photo obligatoire");
    }
    const receiptName = data.receiptName?.trim() || null;
    let companyId: string | null = null;
    if (data.companyId) {
      companyId = await resolveCrmCompanyId(data.companyId, staff.id);
    }
    const budget = await readBudgetSettings();
    const approval =
      data.amount > budget.approvalThreshold ? ("pending" as const) : ("none" as const);

    const row = await prisma.crmExpense.create({
      data: {
        managerId,
        category: data.category,
        label: data.label.trim(),
        amount: data.amount,
        at: toDateInput(data.at)!,
        companyId,
        opportunityId: data.opportunityId || null,
        activityId: data.activityId || null,
        receipt: true,
        receiptPath,
        receiptName,
        approval,
      },
      include: { company: { select: { id: true, clientId: true } } },
    });

    if (approval === "pending") {
      await notifyCrmStaff(
        "Budget à valider",
        `${row.label} — ${Number(row.amount).toLocaleString("fr-FR")} FCFA`,
        "/prospection/budget",
        await loadDirectionIds(),
      );
    }
    await notifyBudgetThreshold(managerId, row.at, Number(row.amount));

    return mapCrmExpense(row, row.company);
  });

export const updateCrmExpense = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      managerId: z.string(),
      category: expenseCategorySchema,
      label: z.string().min(1),
      amount: z.number().positive(),
      at: z.string(),
      companyId: z.string().optional(),
      opportunityId: z.string().optional(),
      activityId: z.string().optional(),
      receipt: z.boolean().optional(),
      receiptPath: z.string().optional(),
      receiptName: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const { staff } = ctx;
    const current = await prisma.crmExpense.findUnique({ where: { id: data.id } });
    if (!current) throw new Error("Dépense introuvable");
    assertOwned(ctx, current.managerId);
    const managerId = ownerFor(ctx, data.managerId);
    const newReceipt = data.receiptPath?.trim();
    if (newReceipt && !newReceipt.startsWith(`${staff.id}/`)) {
      throw new Error("Justificatif invalide");
    }
    const receiptPath = newReceipt || current.receiptPath;
    if (!receiptPath) throw new Error("Justificatif photo obligatoire");
    const receiptName = newReceipt
      ? data.receiptName?.trim() || null
      : current.receiptName;
    let companyId: string | null = null;
    if (data.companyId) {
      companyId = await resolveCrmCompanyId(data.companyId, staff.id);
    }
    const budget = await readBudgetSettings();
    const overThreshold = data.amount > budget.approvalThreshold;
    const amountChanged = Number(current.amount) !== data.amount;
    let approval = current.approval;
    if (overThreshold && (current.approval === "none" || (amountChanged && current.approval !== "pending"))) {
      approval = "pending";
    } else if (!overThreshold && current.approval === "pending") {
      approval = "none";
    }

    const row = await prisma.crmExpense.update({
      where: { id: data.id },
      data: {
        managerId,
        category: data.category,
        label: data.label.trim(),
        amount: data.amount,
        at: toDateInput(data.at)!,
        companyId,
        opportunityId: data.opportunityId || null,
        activityId: data.activityId || null,
        receipt: true,
        receiptPath,
        receiptName,
        approval,
      },
      include: { company: { select: { id: true, clientId: true } } },
    });

    if (approval === "pending" && current.approval !== "pending") {
      await notifyCrmStaff(
        "Budget à valider",
        `${row.label} — ${Number(row.amount).toLocaleString("fr-FR")} FCFA`,
        "/prospection/budget",
        await loadDirectionIds(),
      );
    }
    await notifyBudgetThreshold(
      managerId,
      row.at,
      Math.max(0, Number(row.amount) - Number(current.amount)),
    );

    return mapCrmExpense(row, row.company);
  });

export const setCrmExpenseApproval = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), approval: expenseApprovalSchema }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmAllowed(
      canApproveExpenses(ctx.crm),
      "La validation des dépenses est réservée à la direction.",
    );
    const row = await prisma.crmExpense.update({
      where: { id: data.id },
      data: { approval: data.approval },
      include: { company: { select: { id: true, clientId: true } } },
    });
    return mapCrmExpense(row, row.company);
  });

const objectiveMetricSchema = z.enum([
  "qualifies",
  "contacts",
  "rdv",
  "propositions",
  "signatures",
]);

/** Prépare les objectifs d’un mois (reprise des cibles du mois précédent). */
export const ensureCrmObjectivesMonth = createServerFn({ method: "POST" })
  .validator(z.object({ month: monthSchema }))
  .handler(async ({ data }) => {
    await requireCrm();
    await ensureObjectivesForManagers(portfolioManagers(await loadCrmManagers()), data.month);
    return true;
  });

/** Objectifs mensuels par manager — fixés par la direction (§3). */
export const setCrmObjectiveTargets = createServerFn({ method: "POST" })
  .validator(
    z.object({
      month: monthSchema,
      items: z.array(
        z.object({
          managerId: z.string().min(1),
          metric: objectiveMetricSchema,
          target: z.number().int().min(0),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmAllowed(
      canApproveExpenses(ctx.crm),
      "Les objectifs sont fixés par la direction.",
    );
    await prisma.$transaction(
      data.items.map((item) =>
        prisma.crmObjective.upsert({
          where: {
            managerId_metric_month: {
              managerId: item.managerId,
              metric: item.metric,
              month: data.month,
            },
          },
          create: { ...item, month: data.month },
          update: { target: item.target },
        }),
      ),
    );
    return true;
  });

export const createCrmLibraryItem = createServerFn({ method: "POST" })
  .validator(
    z.object({
      line: libraryDomainSchema,
      category: z.string().min(1),
      title: z.string().min(1),
      body: z.string().min(1),
      terms: z
        .array(z.object({ term: z.string(), def: z.string() }))
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmAllowed(canEditLibrary(ctx.crm), "Bibliothèque en lecture seule pour votre profil.");
    const row = await prisma.crmLibraryItem.create({
      data: {
        line: data.line,
        category: data.category,
        title: data.title.trim(),
        body: data.body.trim(),
        terms: data.terms ?? undefined,
      },
    });
    return mapCrmLibraryItem(row);
  });

export const updateCrmLibraryItem = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      line: libraryDomainSchema,
      category: z.string().min(1),
      title: z.string().min(1),
      body: z.string().min(1),
      terms: z.array(z.object({ term: z.string(), def: z.string() })).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmAllowed(canEditLibrary(ctx.crm), "Bibliothèque en lecture seule pour votre profil.");
    const row = await prisma.crmLibraryItem.update({
      where: { id: data.id },
      data: {
        line: data.line,
        category: data.category,
        title: data.title.trim(),
        body: data.body.trim(),
        terms: data.terms ?? Prisma.JsonNull,
      },
    });
    return mapCrmLibraryItem(row);
  });

export const createCrmReferential = createServerFn({ method: "POST" })
  .validator(z.object({ kind: referentialKindSchema, label: z.string().min(1) }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmAllowed(
      canAdminReferentials(ctx.crm),
      "Paramétrage réservé à l’administrateur et à la direction.",
    );
    const row = await prisma.crmReferential.create({
      data: { kind: data.kind, label: data.label.trim() },
    });
    return mapCrmReferential(row);
  });

export const updateCrmReferential = createServerFn({ method: "POST" })
  .validator(
    z.object({ id: z.string(), kind: referentialKindSchema, label: z.string().min(1) }),
  )
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmAllowed(
      canAdminReferentials(ctx.crm),
      "Paramétrage réservé à l’administrateur et à la direction.",
    );
    const row = await prisma.crmReferential.update({
      where: { id: data.id },
      data: { kind: data.kind, label: data.label.trim() },
    });
    return mapCrmReferential(row);
  });

export const markCrmNotificationRead = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { staff } = await requireSession();
    const existing = await prisma.crmNotification.findFirst({
      where: { id: data.id, staffId: staff.id },
    });
    if (!existing) throw new Error("Notification introuvable");
    const row = await prisma.crmNotification.update({
      where: { id: existing.id },
      data: { read: true },
    });
    return mapCrmNotification(row);
  });

export const updateCrmNotification = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      title: z.string().min(1),
      body: z.string(),
      read: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const { staff } = await requireSession();
    const existing = await prisma.crmNotification.findFirst({
      where: { id: data.id, staffId: staff.id },
    });
    if (!existing) throw new Error("Notification introuvable");
    const row = await prisma.crmNotification.update({
      where: { id: existing.id },
      data: { title: data.title.trim(), body: data.body.trim(), read: data.read },
    });
    return mapCrmNotification(row);
  });

export const markAllCrmNotificationsRead = createServerFn({ method: "POST" }).handler(
  async () => {
    const { staff } = await requireSession();
    await prisma.crmNotification.updateMany({
      where: { staffId: staff.id, read: false },
      data: { read: true },
    });
    return true;
  },
);

export const setCrmBudgetSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      monthlyBudgetPerManager: z.number().positive(),
      alertRatio: z.number().min(0.1).max(1),
      approvalThreshold: z.number().positive(),
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmAllowed(
      canAdminReferentials(ctx.crm),
      "Paramétrage réservé à l’administrateur et à la direction.",
    );
    const row = await prisma.crmBudgetSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        monthlyBudgetPerManager: data.monthlyBudgetPerManager,
        alertRatio: data.alertRatio,
        approvalThreshold: data.approvalThreshold,
      },
      update: {
        monthlyBudgetPerManager: data.monthlyBudgetPerManager,
        alertRatio: data.alertRatio,
        approvalThreshold: data.approvalThreshold,
      },
    });
    return {
      monthlyBudgetPerManager: Number(row.monthlyBudgetPerManager),
      alertRatio: row.alertRatio,
      approvalThreshold: Number(row.approvalThreshold),
    } satisfies BudgetSettings;
  });

export const deleteCrmCompany = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const existing = await prisma.crmCompany.findFirst({
      where: { OR: [{ id: data.id }, { clientId: data.id }] },
    });
    if (!existing) return true;
    assertOwned(ctx, existing.managerId);
    // Supprime uniquement la fiche / overlay CRM — jamais le Client Facturation.
    await prisma.crmCompany.deleteMany({ where: { id: existing.id } });
    return true;
  });

export const deleteCrmContact = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const contact = await prisma.crmContact.findUnique({
      where: { id: data.id },
      select: { company: { select: { managerId: true } } },
    });
    assertOwned(ctx, contact?.company.managerId);
    await prisma.crmContact.deleteMany({ where: { id: data.id } });
    return true;
  });

export const deleteCrmOpportunity = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const opp = await prisma.crmOpportunity.findUnique({
      where: { id: data.id },
      select: { ownerId: true },
    });
    assertOwned(ctx, opp?.ownerId);
    await prisma.crmOpportunity.deleteMany({ where: { id: data.id } });
    return true;
  });

export const deleteCrmActivity = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const activity = await prisma.crmActivity.findUnique({
      where: { id: data.id },
      select: { ownerId: true },
    });
    assertOwned(ctx, activity?.ownerId);
    await prisma.crmActivity.deleteMany({ where: { id: data.id } });
    return true;
  });

export const deleteCrmLead = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    const lead = await prisma.crmLead.findUnique({
      where: { id: data.id },
      select: { ownerId: true, authorId: true },
    });
    if (!lead) return true;
    const mine = lead.authorId === ctx.staff.id || lead.ownerId === ctx.staff.id;
    assertCrmAllowed(
      mine || ctx.crm === "direction" || ctx.crm === "admin",
      "Accès refusé : cette piste n’est pas la vôtre.",
    );
    await prisma.crmLead.deleteMany({ where: { id: data.id } });
    return true;
  });

export const deleteCrmExpense = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    const expense = await prisma.crmExpense.findUnique({
      where: { id: data.id },
      select: { managerId: true },
    });
    assertOwned(ctx, expense?.managerId);
    await prisma.crmExpense.deleteMany({ where: { id: data.id } });
    return true;
  });

export const deleteCrmLibraryItem = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmAllowed(canEditLibrary(ctx.crm), "Bibliothèque en lecture seule pour votre profil.");
    await prisma.crmLibraryItem.deleteMany({ where: { id: data.id } });
    return true;
  });

export const deleteCrmReferential = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmAllowed(
      canAdminReferentials(ctx.crm),
      "Paramétrage réservé à l’administrateur et à la direction.",
    );
    await prisma.crmReferential.deleteMany({ where: { id: data.id } });
    return true;
  });

export const deleteCrmNotification = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { staff } = await requireSession();
    const existing = await prisma.crmNotification.findFirst({
      where: { id: data.id, staffId: staff.id },
    });
    if (!existing) throw new Error("Notification introuvable");
    await prisma.crmNotification.delete({ where: { id: existing.id } });
    return true;
  });

/** Téléverse un justificatif photo (bucket privé) avant l’enregistrement de la dépense. */
export const uploadCrmReceipt = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1),
      contentType: z.string().min(1),
      base64: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    assertCrmWriter(ctx);
    return uploadCrmReceiptFile(ctx.staff.id, data);
  });

/** Lien temporaire vers le justificatif (manager concerné, direction, administrateur). */
export const getCrmReceiptUrl = createServerFn({ method: "POST" })
  .validator(z.object({ expenseId: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await requireCrm();
    const expense = await prisma.crmExpense.findUnique({
      where: { id: data.expenseId },
      select: { managerId: true, receiptPath: true },
    });
    if (!expense) throw new Error("Dépense introuvable");
    assertCrmAllowed(
      ctx.crm === "direction" || ctx.crm === "admin" || expense.managerId === ctx.staff.id,
      "Accès refusé à ce justificatif.",
    );
    if (!expense.receiptPath) throw new Error("Aucun justificatif téléversé pour cette dépense");
    return { url: await createReceiptSignedUrl(expense.receiptPath) };
  });



/**
 * Émulation entre managers (tableau de bord Prospection) : chaque profil voit
 * ses chiffres et ceux des autres managers pour la semaine en cours, en
 * compteurs agrégés — sans accès aux fiches, affaires ou montants des autres.
 */
export const getCrmTeamPulse = createServerFn({ method: "GET" }).handler(async () => {
  const ctx = await requireCrm();
  return computeTeamPulse(portfolioManagers(await loadCrmManagers()), ctx.staff.id);
});
