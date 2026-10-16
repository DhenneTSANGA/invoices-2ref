import { prisma } from "@/lib/prisma";
import { addDaysIso, crmTodayIso, crmWeekStart, currentCrmMonth } from "@/lib/crm-month";
import type { Manager } from "@/lib/prospection-model";
/** Indicateurs comparés entre managers (compteurs uniquement, jamais de client ni de montant). */
export type TeamPulseCounts = {
  qualified: number;
  contacts: number;
  rdv: number;
  proposals: number;
  signatures: number;
  actions: number;
};

export type TeamPulseManager = {
  id: string;
  name: string;
  /** Semaine en cours, de lundi 00:00 à maintenant (heure de Libreville). */
  current: TeamPulseCounts;
  /** Semaine dernière, sur la même durée écoulée (évolution à heure égale). */
  previous: TeamPulseCounts;
  /** Cibles de la semaine = objectif du mois × 7 / nombre de jours du mois. */
  weeklyTargets: Omit<TeamPulseCounts, "actions">;
};

export type TeamPulse = {
  weekKey: string;
  generatedAt: string;
  selfId: string;
  managers: TeamPulseManager[];
};

const PULSE_CONTACT_KINDS = new Set(["appel", "email", "visite"]);

/**
 * Compteurs de la semaine en cours (et de la semaine dernière à durée égale)
 * pour chaque porteur de portefeuille.
 */
export async function computeTeamPulse(
  managers: Manager[],
  selfId: string,
  now = new Date(),
): Promise<TeamPulse> {
  const ids = managers.map((m) => m.id);
  const DAY = 86_400_000;
  const weekKey = crmWeekStart(now);
  const today = crmTodayIso(now);
  const prevWeekKey = addDaysIso(weekKey, -7);
  const prevToday = addDaysIso(today, -7);
  // Lundi 00:00 à Libreville (UTC+1).
  const weekStart = new Date(`${weekKey}T00:00:00.000+01:00`);
  const prevStart = new Date(weekStart.getTime() - 7 * DAY);
  const prevNow = new Date(now.getTime() - 7 * DAY);
  const month = currentCrmMonth(now);
  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();

  const [activities, opportunities, objectives] =
    ids.length === 0
      ? [[], [], []]
      : await Promise.all([
          prisma.crmActivity.findMany({
            where: {
              ownerId: { in: ids },
              status: "terminee",
              at: {
                gte: new Date(`${prevWeekKey}T00:00:00.000Z`),
                lte: new Date(`${today}T23:59:59.999Z`),
              },
            },
            select: { ownerId: true, kind: true, at: true, companyId: true },
          }),
          prisma.crmOpportunity.findMany({
            where: {
              ownerId: { in: ids },
              OR: [
                { qualifiedAt: { gte: prevStart } },
                { proposalAt: { gte: prevStart } },
                { wonAt: { gte: prevStart } },
              ],
            },
            select: { ownerId: true, qualifiedAt: true, proposalAt: true, wonAt: true },
          }),
          prisma.crmObjective.findMany({
            where: { managerId: { in: ids }, month },
            select: { managerId: true, metric: true, target: true },
          }),
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
    return {
      qualified: opps.filter((o) => inRange(o.qualifiedAt)).length,
      contacts: new Set(acts.filter((a) => PULSE_CONTACT_KINDS.has(a.kind)).map((a) => a.companyId))
        .size,
      rdv: acts.filter((a) => a.kind === "rdv").length,
      proposals: opps.filter((o) => inRange(o.proposalAt)).length,
      signatures: opps.filter((o) => inRange(o.wonAt)).length,
      actions: acts.length,
    };
  };

  const weekly = (managerId: string, metric: string) => {
    const monthly = objectives.find(
      (o) => o.managerId === managerId && o.metric === metric,
    )?.target;
    return monthly ? Math.round(((monthly * 7) / daysInMonth) * 10) / 10 : 0;
  };

  return {
    weekKey,
    generatedAt: now.toISOString(),
    selfId,
    managers: managers.map((m) => ({
      id: m.id,
      name: m.name,
      current: count(m.id, weekKey, today, weekStart, now),
      previous: count(m.id, prevWeekKey, prevToday, prevStart, prevNow),
      weeklyTargets: {
        qualified: weekly(m.id, "qualifies"),
        contacts: weekly(m.id, "contacts"),
        rdv: weekly(m.id, "rdv"),
        proposals: weekly(m.id, "propositions"),
        signatures: weekly(m.id, "signatures"),
      },
    })),
  };
}
