import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Prisma, type CrmPipelineStage, type CrmServiceLine } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, type AppSession } from "@/lib/session.functions";
import { canAccessSpace } from "@/lib/app-space";
import {
  EXPENSE_APPROVAL_THRESHOLD,
  MANAGERS,
  STAGE_LABELS,
  STAGE_PROBABILITY,
  type ActivityKind,
  type ActivityStatus,
  type Company,
  type CompanyKind,
  type LeadStatus,
  type OpportunitySource,
  type PipelineStage,
  type Site,
} from "@/lib/prospection-demo";
import {
  DEFAULT_OBJECTIVE_TARGETS,
  DEFAULT_WEEK_CHECKS,
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
  mapCrmWeekCheck,
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
  return session;
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

async function ensureCrmDefaults() {
  const [objCount, weekCount] = await Promise.all([
    prisma.crmObjective.count(),
    prisma.crmWeekCheck.count(),
  ]);

  if (objCount === 0) {
    await prisma.crmObjective.createMany({
      data: MANAGERS.flatMap((m) =>
        DEFAULT_OBJECTIVE_TARGETS.map((t) => ({
          managerId: m.id,
          metric: t.metric,
          target: t.target,
        })),
      ),
    });
  }

  if (weekCount === 0) {
    await prisma.crmWeekCheck.createMany({
      data: DEFAULT_WEEK_CHECKS.map((w) => ({
        key: w.key,
        label: w.label,
        sortOrder: w.sortOrder,
        done: false,
      })),
    });
  }
}

async function createCrmNotificationRow(title: string, body: string, href: string) {
  return prisma.crmNotification.create({
    data: { title, body, href, at: new Date() },
  });
}

async function loadPipelineSnapshot(): Promise<CrmPipelineSnapshot> {
  await ensureCrmDefaults();

  const [
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
    weekChecks,
  ] = await Promise.all([
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
    prisma.crmObjective.findMany({ orderBy: [{ managerId: "asc" }, { metric: "asc" }] }),
    prisma.crmNotification.findMany({ orderBy: { at: "desc" } }),
    prisma.crmLibraryItem.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.crmReferential.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.crmWeekCheck.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const localCompanies = companies.filter((c) => !c.clientId).map(mapCrmCompany);
  const clientOverlays: CrmPipelineSnapshot["clientOverlays"] = {};
  for (const c of companies) {
    if (c.clientId) clientOverlays[c.clientId] = overlayFromCrmCompany(c);
  }

  return {
    companies: localCompanies,
    clientOverlays,
    contacts: contacts.map((c) => mapCrmContact(c, c.company)),
    opportunities: opportunities.map((o) => mapCrmOpportunity(o, o.company)),
    activities: activities.map((a) => mapCrmActivity(a, a.company)),
    leads: leads.map((l) => mapCrmLead(l, l.company)),
    expenses: expenses.map((e) => mapCrmExpense(e, e.company)),
    objectives: objectives.map(mapCrmObjective),
    notifications: notifications.map(mapCrmNotification),
    libraryItems: libraryItems.map(mapCrmLibraryItem),
    referentials: referentials.map(mapCrmReferential),
    weekChecks: weekChecks.map(mapCrmWeekCheck),
  };
}

export const listCrmPipeline = createServerFn({ method: "GET" }).handler(async () => {
  await requireSession();
  return loadPipelineSnapshot();
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
    const { staff } = await requireSession();
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
      managerId: data.managerId ?? "",
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
    await requireSession();
    const existing = await prisma.crmCompany.findFirst({
      where: { OR: [{ id: data.id }, { clientId: data.id }] },
    });
    if (!existing) throw new Error("Entreprise introuvable");

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
        ...(data.managerId != null ? { managerId: data.managerId } : {}),
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
    const { staff } = await requireSession();
    const crmId = await resolveCrmCompanyId(data.clientId, staff.id);
    const row = await prisma.crmCompany.update({
      where: { id: crmId },
      data: {
        ...(data.strategic != null ? { strategic: data.strategic } : {}),
        ...(data.managerId != null ? { managerId: data.managerId } : {}),
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
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireSession();
    const existing = await prisma.crmCompany.findFirst({
      where: { OR: [{ id: data.id }, { clientId: data.id }] },
    });
    if (!existing) throw new Error("Prospect introuvable");
    const row = await prisma.crmCompany.update({
      where: { id: existing.id },
      data: { kind: "client" },
    });
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
    const { staff } = await requireSession();
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
    const { staff } = await requireSession();
    const companyId = await resolveCrmCompanyId(data.companyId, staff.id);
    const stage = (data.stage ?? "qualification") as CrmPipelineStage;
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
      ownerId: data.ownerId,
      notes: data.notes ?? "",
      lostReason: data.lostReason ?? null,
      reviveOn: toDateInput(data.reviveOn),
    };

    if (data.id) {
      const row = await prisma.crmOpportunity.update({
        where: { id: data.id },
        data: common,
        include: { company: { select: { id: true, clientId: true } } },
      });
      return mapCrmOpportunity(row, row.company);
    }

    const row = await prisma.crmOpportunity.create({
      data: common,
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
    await requireSession();
    const current = await prisma.crmOpportunity.findUnique({
      where: { id: data.id },
      include: { company: true },
    });
    if (!current) throw new Error("Opportunité introuvable");

    const stage = data.stage as CrmPipelineStage;
    const probability = STAGE_PROBABILITY[stage as PipelineStage] ?? current.probability;

    const [opportunity, activity] = await prisma.$transaction(async (tx) => {
      const opp = await tx.crmOpportunity.update({
        where: { id: data.id },
        data: {
          stage,
          probability,
          nextAction: data.nextAction,
          nextActionOn: toDateInput(data.nextActionOn),
          lostReason: data.lostReason ?? current.lostReason,
          reviveOn: data.reviveOn ? toDateInput(data.reviveOn) : current.reviveOn,
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
    await createCrmNotificationRow(
      `Étape : ${STAGE_LABELS[stage as PipelineStage]}`,
      `${company.name} — ${data.nextAction}`,
      "/prospection/opportunites",
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
    const { staff } = await requireSession();
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
      ownerId: data.ownerId,
      status: (data.status ?? "terminee") as ActivityStatus,
    };

    if (data.id) {
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
    await requireSession();
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
  ownerId: z.string(),
  author: z.string().optional(),
  status: leadStatusSchema.optional(),
});

export const upsertCrmLead = createServerFn({ method: "POST" })
  .validator(leadInputSchema)
  .handler(async ({ data }) => {
    const { staff } = await requireSession();
    let companyId: string | null = null;
    if (data.companyId) {
      companyId = await resolveCrmCompanyId(data.companyId, staff.id);
    }
    const common = {
      companyName: data.companyName.trim(),
      companyId,
      line: data.line as CrmServiceLine,
      need: data.need.trim(),
      comment: data.comment ?? "",
      ownerId: data.ownerId,
      author: data.author ?? "",
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
      data: common,
      include: { company: { select: { id: true, clientId: true } } },
    });
    return mapCrmLead(row, row.company);
  });

export const setCrmLeadStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), status: leadStatusSchema }))
  .handler(async ({ data }) => {
    await requireSession();
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
    const { staff } = await requireSession();
    const lead = await prisma.crmLead.findUnique({ where: { id: data.id } });
    if (!lead) throw new Error("Piste introuvable");
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

    await createCrmNotificationRow(
      "Piste convertie",
      `${result.lead.companyName} — opportunité en Qualification.`,
      "/prospection/opportunites",
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
    const { staff } = await requireSession();
    const created: Company[] = [];
    for (const row of data.rows) {
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
          managerId: row.managerId ?? "",
          servicesBought: (row.servicesBought ?? []) as CrmServiceLine[],
          targetLines: (row.targetLines ?? []) as CrmServiceLine[],
          source: row.source ?? "nouveau",
          strategic: row.strategic ?? false,
          caSigned: row.caSigned ?? 0,
          notes: row.notes ?? "",
          createdById: staff.id,
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
    const { staff } = await requireSession();
    const crmId = await resolveCrmCompanyId(data.companyId, staff.id);
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
const referentialKindSchema = z.enum(["line", "stage", "site", "expense", "sector"]);

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
    }),
  )
  .handler(async ({ data }) => {
    const { staff } = await requireSession();
    let companyId: string | null = null;
    if (data.companyId) {
      companyId = await resolveCrmCompanyId(data.companyId, staff.id);
    }
    const approval =
      data.amount > EXPENSE_APPROVAL_THRESHOLD ? ("pending" as const) : ("none" as const);

    const row = await prisma.crmExpense.create({
      data: {
        managerId: data.managerId,
        category: data.category,
        label: data.label.trim(),
        amount: data.amount,
        at: toDateInput(data.at)!,
        companyId,
        opportunityId: data.opportunityId || null,
        activityId: data.activityId || null,
        receipt: data.receipt ?? false,
        approval,
      },
      include: { company: { select: { id: true, clientId: true } } },
    });

    if (approval === "pending") {
      await createCrmNotificationRow(
        "Budget à valider",
        `${row.label} — ${Number(row.amount).toLocaleString("fr-FR")} FCFA`,
        "/prospection/budget",
      );
    }

    return mapCrmExpense(row, row.company);
  });

export const setCrmExpenseApproval = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), approval: expenseApprovalSchema }))
  .handler(async ({ data }) => {
    await requireSession();
    const row = await prisma.crmExpense.update({
      where: { id: data.id },
      data: { approval: data.approval },
      include: { company: { select: { id: true, clientId: true } } },
    });
    return mapCrmExpense(row, row.company);
  });

export const setCrmObjectiveTarget = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), target: z.number().int().min(0) }))
  .handler(async ({ data }) => {
    await requireSession();
    const row = await prisma.crmObjective.update({
      where: { id: data.id },
      data: { target: data.target },
    });
    return mapCrmObjective(row);
  });

export const upsertCrmObjectivesBulk = createServerFn({ method: "POST" })
  .validator(
    z.object({
      items: z.array(z.object({ id: z.string(), target: z.number().int().min(0) })),
    }),
  )
  .handler(async ({ data }) => {
    await requireSession();
    await prisma.$transaction(
      data.items.map((item) =>
        prisma.crmObjective.update({
          where: { id: item.id },
          data: { target: item.target },
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
    await requireSession();
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

export const createCrmReferential = createServerFn({ method: "POST" })
  .validator(z.object({ kind: referentialKindSchema, label: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireSession();
    const row = await prisma.crmReferential.create({
      data: { kind: data.kind, label: data.label.trim() },
    });
    return mapCrmReferential(row);
  });

export const toggleCrmWeekCheck = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireSession();
    const current = await prisma.crmWeekCheck.findUnique({ where: { id: data.id } });
    if (!current) throw new Error("Point de routine introuvable");
    const row = await prisma.crmWeekCheck.update({
      where: { id: data.id },
      data: { done: !current.done },
    });
    return mapCrmWeekCheck(row);
  });

export const markCrmNotificationRead = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireSession();
    const row = await prisma.crmNotification.update({
      where: { id: data.id },
      data: { read: true },
    });
    return mapCrmNotification(row);
  });

export const markAllCrmNotificationsRead = createServerFn({ method: "POST" }).handler(
  async () => {
    await requireSession();
    await prisma.crmNotification.updateMany({
      where: { read: false },
      data: { read: true },
    });
    return true;
  },
);
