import { prisma } from "@/lib/prisma";
import { addDaysIso, crmTodayIso, crmWeekStart, currentCrmMonth } from "@/lib/crm-month";
import type { Manager } from "@/lib/prospection-model";
import type { Cabinet } from "@/lib/cabinets";
import { loadManagerInvoices } from "@/lib/document-prospection-db";

export type TeamPulsePeriod = "week" | "month" | "year";

/** Indicateurs comparés entre managers (jamais de client ni de détail d’affaire). */
export type TeamPulseCounts = {
  qualified: number;
  contacts: number;
  rdv: number;
  proposals: number;
  signatures: number;
  actions: number;
  /** Honoraires des missions signées sur la période (FCFA). */
  signedAmount: number;
  /** Factures encaissées sur la période (Facturation, manager apporteur). */
  collectedAmount: number;
  /** Factures émises sur la période (hors brouillons et annulées). */
  invoicedAmount: number;
};

/** Facture rattachée à un manager, affichée dans la Prospection. */
export type TeamPulseInvoice = {
  id: string;
  managerId: string;
  number: string;
  clientName: string;
  issueDate: string;
  total: number;
  /** Reste dû (acompte déduit) ; 0 si payée. */
  due: number;
  status: string;
  paidAt: string | null;
};

export type TeamPulseTargets = Pick<
  TeamPulseCounts,
  "qualified" | "contacts" | "rdv" | "proposals" | "signatures"
>;

export type TeamPulseManager = {
  id: string;
  name: string;
  /** Période en cours, de son début à maintenant (heure de Libreville). */
  current: TeamPulseCounts;
  /** Période précédente, sur la même durée écoulée (évolution à heure égale). */
  previous: TeamPulseCounts;
  /** Cibles de la période : objectif du mois (mois) ou objectif × 7 / jours du mois (semaine). */
  targets: TeamPulseTargets;
  /** Reste à encaisser aujourd’hui : factures émises non payées (acompte déduit). */
  outstanding: number;
};

export type TeamPulse = {
  period: TeamPulsePeriod;
  /** Premier jour de la période (AAAA-MM-JJ). */
  periodStart: string;
  generatedAt: string;
  selfId: string;
  managers: TeamPulseManager[];
  /** Factures de la période (émises ou encaissées) et toutes celles restant à encaisser. */
  invoices: TeamPulseInvoice[];
};

const PULSE_CONTACT_KINDS = new Set(["appel", "email", "visite"]);

/** Facture émise entre deux jours (AAAA-MM-JJ, bornes incluses). */
function issuedIn(issueDate: Date, fromIso: string, toIso: string) {
  const iso = issueDate.toISOString().slice(0, 10);
  return iso >= fromIso && iso <= toIso;
}

function daysInMonth(year: number, month1: number) {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/**
 * Bornes de la période en cours et de la période précédente à durée écoulée égale
 * (semaine : lundi 00:00 ; mois : le 1er à 00:00 ; année : 1er janvier — heure de Libreville, UTC+1).
 */
function periodBounds(period: TeamPulsePeriod, now: Date) {
  const DAY = 86_400_000;
  const today = crmTodayIso(now);
  if (period === "year") {
    const y = Number(today.slice(0, 4));
    const startIso = `${y}-01-01`;
    const start = new Date(`${startIso}T00:00:00.000+01:00`);
    // Même date l’an dernier (29 février → 28), même heure.
    const mmdd = today.slice(5) === "02-29" ? "02-28" : today.slice(5);
    const prevToday = `${y - 1}-${mmdd}`;
    const elapsed = now.getTime() - new Date(`${today}T00:00:00.000+01:00`).getTime();
    return {
      startIso,
      today,
      start,
      prevStartIso: `${y - 1}-01-01`,
      prevToday,
      prevStart: new Date(`${y - 1}-01-01T00:00:00.000+01:00`),
      prevNow: new Date(new Date(`${prevToday}T00:00:00.000+01:00`).getTime() + elapsed),
    };
  }
  if (period === "week") {
    const startIso = crmWeekStart(now);
    const start = new Date(`${startIso}T00:00:00.000+01:00`);
    return {
      startIso,
      today,
      start,
      prevStartIso: addDaysIso(startIso, -7),
      prevToday: addDaysIso(today, -7),
      prevStart: new Date(start.getTime() - 7 * DAY),
      prevNow: new Date(now.getTime() - 7 * DAY),
    };
  }
  const month = currentCrmMonth(now);
  const [y, m] = month.split("-").map(Number);
  const startIso = `${month}-01`;
  const start = new Date(`${startIso}T00:00:00.000+01:00`);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const prevMonth = `${prevY}-${String(prevM).padStart(2, "0")}`;
  const prevStartIso = `${prevMonth}-01`;
  const prevStart = new Date(`${prevStartIso}T00:00:00.000+01:00`);
  // Même jour du mois précédent (plafonné à sa longueur), même heure.
  const day = Math.min(Number(today.slice(8, 10)), daysInMonth(prevY, prevM));
  const prevToday = `${prevMonth}-${String(day).padStart(2, "0")}`;
  const elapsed = now.getTime() - new Date(`${today}T00:00:00.000+01:00`).getTime();
  const prevNow = new Date(new Date(`${prevToday}T00:00:00.000+01:00`).getTime() + elapsed);
  return { startIso, today, start, prevStartIso, prevToday, prevStart, prevNow };
}

/**
 * Compteurs et CA signé de la période en cours (et de la précédente à durée égale)
 * pour chaque porteur de portefeuille.
 */
export async function computeTeamPulse(
  managers: Manager[],
  selfId: string,
  period: TeamPulsePeriod = "week",
  now = new Date(),
  cabinet: Cabinet = "conseil",
): Promise<TeamPulse> {
  const ids = managers.map((m) => m.id);
  const b = periodBounds(period, now);
  const month = currentCrmMonth(now);
  const [year, monthNum] = month.split("-").map(Number);
  const monthDays = daysInMonth(year, monthNum);

  const [activities, opportunities, objectives, invoices] =
    ids.length === 0
      ? [[], [], [], []]
      : await Promise.all([
          prisma.crmActivity.findMany({
            where: {
              ownerId: { in: ids },
              cabinet,
              status: "terminee",
              at: {
                gte: new Date(`${b.prevStartIso}T00:00:00.000Z`),
                lte: new Date(`${b.today}T23:59:59.999Z`),
              },
            },
            select: { ownerId: true, kind: true, at: true, companyId: true },
          }),
          prisma.crmOpportunity.findMany({
            where: {
              ownerId: { in: ids },
              cabinet,
              OR: [
                { qualifiedAt: { gte: b.prevStart } },
                { proposalAt: { gte: b.prevStart } },
                { wonAt: { gte: b.prevStart } },
              ],
            },
            select: {
              ownerId: true,
              qualifiedAt: true,
              proposalAt: true,
              wonAt: true,
              amount: true,
            },
          }),
          prisma.crmObjective.findMany({
            where: {
              managerId: { in: ids },
              cabinet,
              // Année : tous les objectifs saisis jusqu’en décembre (reportés sur les mois sans cible).
              month: period === "year" ? { lte: `${year}-12` } : month,
            },
            select: { managerId: true, metric: true, target: true, month: true },
          }),
          loadManagerInvoices(ids, cabinet),
        ]);

  const count = (
    managerId: string,
    fromIso: string,
    toIso: string,
    from: Date,
    to: Date,
  ): TeamPulseCounts => {
    const acts = activities.filter((a) => {
      if (a.ownerId !== managerId) return false;
      const iso = a.at.toISOString().slice(0, 10);
      return iso >= fromIso && iso <= toIso;
    });
    const opps = opportunities.filter((o) => o.ownerId === managerId);
    const inRange = (d: Date | null) => Boolean(d && d >= from && d <= to);
    const won = opps.filter((o) => inRange(o.wonAt));
    return {
      qualified: opps.filter((o) => inRange(o.qualifiedAt)).length,
      contacts: new Set(acts.filter((a) => PULSE_CONTACT_KINDS.has(a.kind)).map((a) => a.companyId))
        .size,
      rdv: acts.filter((a) => a.kind === "rdv").length,
      proposals: opps.filter((o) => inRange(o.proposalAt)).length,
      signatures: won.length,
      actions: acts.length,
      signedAmount: won.reduce((s, o) => s + Number(o.amount), 0),
      collectedAmount: invoices
        .filter((f) => f.managerId === managerId && f.status === "paid" && inRange(f.paidAt))
        .reduce((s, f) => s + f.total, 0),
      invoicedAmount: invoices
        .filter((f) => f.managerId === managerId && issuedIn(f.issueDate, fromIso, toIso))
        .reduce((s, f) => s + f.total, 0),
    };
  };

  const periodInvoices: TeamPulseInvoice[] = invoices
    .filter(
      (f) =>
        f.status !== "paid" ||
        issuedIn(f.issueDate, b.startIso, b.today) ||
        Boolean(f.paidAt && f.paidAt >= b.start && f.paidAt <= now),
    )
    .sort((a, z) => z.issueDate.getTime() - a.issueDate.getTime())
    .map((f) => ({
      id: f.id,
      managerId: f.managerId,
      number: f.number,
      clientName: f.clientName,
      issueDate: f.issueDate.toISOString().slice(0, 10),
      total: f.total,
      due: f.status === "paid" ? 0 : Math.max(0, f.total - f.deposit),
      status: f.status,
      paidAt: f.paidAt ? f.paidAt.toISOString() : null,
    }));

  const outstanding = (managerId: string) =>
    invoices
      .filter((f) => f.managerId === managerId && f.status !== "paid")
      .reduce((s, f) => s + Math.max(0, f.total - f.deposit), 0);

  const target = (managerId: string, metric: string) => {
    const mine = objectives.filter((o) => o.managerId === managerId && o.metric === metric);
    if (period === "year") {
      // Objectif annuel = 12 objectifs mensuels : celui saisi pour le mois, sinon le
      // dernier en vigueur avant (ou, pour les mois antérieurs au premier, le premier saisi).
      const byMonth = [...mine].sort((a, z) => a.month.localeCompare(z.month));
      if (byMonth.length === 0) return 0;
      let total = 0;
      for (let mm = 1; mm <= 12; mm++) {
        const key = `${year}-${String(mm).padStart(2, "0")}`;
        const inForce = byMonth.filter((o) => o.month <= key).at(-1) ?? byMonth[0];
        total += inForce.target;
      }
      return total;
    }
    const monthly = mine[0]?.target;
    if (!monthly) return 0;
    return period === "month" ? monthly : Math.round(((monthly * 7) / monthDays) * 10) / 10;
  };

  return {
    period,
    periodStart: b.startIso,
    generatedAt: now.toISOString(),
    selfId,
    managers: managers.map((m) => ({
      id: m.id,
      name: m.name,
      current: count(m.id, b.startIso, b.today, b.start, now),
      previous: count(m.id, b.prevStartIso, b.prevToday, b.prevStart, b.prevNow),
      targets: {
        qualified: target(m.id, "qualifies"),
        contacts: target(m.id, "contacts"),
        rdv: target(m.id, "rdv"),
        proposals: target(m.id, "propositions"),
        signatures: target(m.id, "signatures"),
      },
      outstanding: outstanding(m.id),
    })),
    invoices: periodInvoices,
  };
}

/** Une semaine de l’évolution d’équipe (vue direction). */
export type TeamTrendWeek = {
  /** Lundi de la semaine (AAAA-MM-JJ). */
  weekKey: string;
  /** Semaine en cours, donc incomplète. */
  partial: boolean;
  signatures: number;
  proposals: number;
  rdv: number;
  signedAmount: number;
};

/**
 * Évolution semaine par semaine de l’équipe (cahier des charges §6, vue direction) :
 * signatures, offres, RDV et CA signé des porteurs de portefeuille sur les
 * `weeks` dernières semaines, semaine en cours comprise.
 */
export async function computeTeamTrend(
  managers: Manager[],
  weeks = 8,
  now = new Date(),
  cabinet: Cabinet = "conseil",
): Promise<TeamTrendWeek[]> {
  const ids = managers.map((m) => m.id);
  const currentKey = crmWeekStart(now);
  const keys = Array.from({ length: weeks }, (_, i) => addDaysIso(currentKey, -7 * (weeks - 1 - i)));
  const firstKey = keys[0];
  const firstStart = new Date(`${firstKey}T00:00:00.000+01:00`);
  const empty = keys.map((weekKey) => ({
    weekKey,
    partial: weekKey === currentKey,
    signatures: 0,
    proposals: 0,
    rdv: 0,
    signedAmount: 0,
  }));
  if (ids.length === 0) return empty;

  const [rdvs, opportunities] = await Promise.all([
    prisma.crmActivity.findMany({
      where: {
        ownerId: { in: ids },
        cabinet,
        kind: "rdv",
        status: "terminee",
        at: { gte: new Date(`${firstKey}T00:00:00.000Z`) },
      },
      select: { at: true },
    }),
    prisma.crmOpportunity.findMany({
      where: {
        ownerId: { in: ids },
        cabinet,
        OR: [{ proposalAt: { gte: firstStart } }, { wonAt: { gte: firstStart } }],
      },
      select: { proposalAt: true, wonAt: true, amount: true },
    }),
  ]);

  /** Lundi (heure de Libreville) de la semaine d’un instant donné. */
  const weekOfInstant = (d: Date) => crmWeekStart(d);
  /** Lundi de la semaine d’une date stockée à midi UTC (actions). */
  const weekOfDate = (d: Date) => crmWeekStart(new Date(`${d.toISOString().slice(0, 10)}T12:00:00.000Z`));
  const byKey = new Map(empty.map((w) => [w.weekKey, w]));

  for (const a of rdvs) {
    const w = byKey.get(weekOfDate(a.at));
    if (w) w.rdv += 1;
  }
  for (const o of opportunities) {
    if (o.proposalAt) {
      const w = byKey.get(weekOfInstant(o.proposalAt));
      if (w) w.proposals += 1;
    }
    if (o.wonAt) {
      const w = byKey.get(weekOfInstant(o.wonAt));
      if (w) {
        w.signatures += 1;
        w.signedAmount += Number(o.amount);
      }
    }
  }
  return empty;
}
