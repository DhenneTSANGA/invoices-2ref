import {
  ACTIVE_STAGES,
  addBusinessDays,
  type Activity,
  type Opportunity,
  type ProspectionData,
} from "@/lib/prospection-model";
import { addDaysIso, crmTodayIso, crmWeekStart, isoWeekday } from "@/lib/crm-month";

/**
 * Semaine commerciale d’un manager, calculée depuis ce qu’il a réellement prévu :
 * les actions de l’agenda (appels, e-mails, visites, RDV, événements) et les
 * prochaines actions fixées sur ses opportunités. Rien n’est déclaratif.
 * Semaine = lundi → dimanche, heure de Libreville.
 */

type WeekData = Pick<ProspectionData, "activities" | "opportunities" | "expenses">;

export type AgendaItem =
  | { source: "activity"; date: string; time?: string; activity: Activity }
  | { source: "opportunity"; date: string; opportunity: Opportunity };

export type AgendaDay = { date: string; items: AgendaItem[] };

export type WeeklyAgenda = {
  weekKey: string;
  today: string;
  /** Prévu avant aujourd’hui et toujours pas fait. */
  overdue: AgendaItem[];
  /** Aujourd’hui → dimanche, jours sans rien exclus. */
  days: AgendaDay[];
  /** Actions terminées cette semaine. */
  done: number;
  /** Prévu d’ici dimanche (aujourd’hui inclus). */
  upcoming: number;
};

const OPEN_ACTIVITY = new Set(["a_faire", "planifiee", "en_cours", "en_retard"]);

function byDateTime(a: AgendaItem, b: AgendaItem) {
  const ta = a.source === "activity" ? (a.time ?? "") : "99:99";
  const tb = b.source === "activity" ? (b.time ?? "") : "99:99";
  return a.date.localeCompare(b.date) || ta.localeCompare(tb);
}

export function computeWeeklyAgenda(
  data: WeekData,
  staffId: string,
  now = new Date(),
): WeeklyAgenda {
  const today = crmTodayIso(now);
  const weekKey = crmWeekStart(now);
  const weekEnd = addDaysIso(weekKey, 6);

  const openActs = data.activities.filter(
    (a) => a.ownerId === staffId && OPEN_ACTIVITY.has(a.status) && a.at,
  );
  const activityItems: AgendaItem[] = openActs.map((a) => ({
    source: "activity",
    date: a.at,
    time: a.time,
    activity: a,
  }));

  // Prochaine action d’opportunité, sauf si une action d’agenda la couvre déjà ce jour-là.
  const planned = new Set(
    openActs.filter((a) => a.opportunityId).map((a) => `${a.opportunityId}:${a.at}`),
  );
  const oppItems: AgendaItem[] = data.opportunities
    .filter(
      (o) =>
        o.ownerId === staffId &&
        ACTIVE_STAGES.includes(o.stage) &&
        o.nextActionOn &&
        !planned.has(`${o.id}:${o.nextActionOn}`),
    )
    .map((o) => ({ source: "opportunity", date: o.nextActionOn, opportunity: o }));

  const all = [...activityItems, ...oppItems].sort(byDateTime);
  const overdue = all.filter((i) => i.date < today);
  const days: AgendaDay[] = [];
  for (let d = today; d <= weekEnd; d = addDaysIso(d, 1)) {
    const items = all.filter((i) => i.date === d);
    if (items.length > 0) days.push({ date: d, items });
  }

  return {
    weekKey,
    today,
    overdue,
    days,
    done: data.activities.filter(
      (a) =>
        a.ownerId === staffId && a.status === "terminee" && a.at >= weekKey && a.at <= weekEnd,
    ).length,
    upcoming: days.reduce((n, d) => n + d.items.length, 0),
  };
}

export type RoutineStatus = "ok" | "pending" | "late";

export type RoutineItem = {
  key: "contacts" | "reports" | "proposals" | "expenses";
  label: string;
  status: RoutineStatus;
  detail: string;
};

const CONTACT_KINDS = new Set(["appel", "email", "visite"]);
const WEEKLY_CONTACTS = 5;
const WEEKLY_RDV = 2;

function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}

/**
 * Respect du canevas (§4) par un manager, pour la vue direction — entièrement
 * calculé depuis ses actions, opportunités et dépenses de la semaine.
 */
export function computeWeeklyRoutine(
  data: WeekData,
  staffId: string,
  now = new Date(),
): RoutineItem[] {
  const today = crmTodayIso(now);
  const weekday = isoWeekday(today);
  const weekKey = crmWeekStart(now);
  const weekEnd = addDaysIso(weekKey, 6);
  const inWeek = (iso?: string) => Boolean(iso && iso >= weekKey && iso <= weekEnd);
  const acts = data.activities.filter((a) => a.ownerId === staffId);

  // Au moins 5 nouveaux contacts et 2 rendez-vous programmés dans la semaine.
  const contacts = acts.filter(
    (a) => CONTACT_KINDS.has(a.kind) && a.status === "terminee" && inWeek(a.at),
  ).length;
  const rdv = acts.filter(
    (a) => a.kind === "rdv" && a.status !== "annulee" && inWeek(a.at),
  ).length;
  const volumeMet = contacts >= WEEKLY_CONTACTS && rdv >= WEEKLY_RDV;

  // Compte rendu et prochaine action sous 48 h après chaque RDV.
  const dueBefore = addDaysIso(today, -2);
  const since = addDaysIso(weekKey, -7);
  const missingReports = acts.filter(
    (a) =>
      a.kind === "rdv" &&
      a.status !== "annulee" &&
      a.at >= since &&
      a.at <= dueBefore &&
      (a.status !== "terminee" || !a.summary.trim() || !a.nextAction?.trim()),
  ).length;

  // Proposition sous 5 jours ouvrés : affaires entrées en « Proposition » (RDV tenu)
  // dont la proposition n’est toujours pas envoyée.
  const lateProposals = data.opportunities.filter(
    (o) =>
      o.ownerId === staffId &&
      o.stage === "proposition" &&
      o.stageChangedAt &&
      addBusinessDays(o.stageChangedAt, 5) < today,
  ).length;

  // Dépenses de la semaine (information : une semaine sans dépense est possible).
  const weekExpenses = data.expenses.filter(
    (e) => e.managerId === staffId && inWeek(e.at),
  ).length;

  return [
    {
      key: "contacts",
      label: `${WEEKLY_CONTACTS} contacts · ${WEEKLY_RDV} RDV`,
      status: volumeMet ? "ok" : weekday >= 5 ? "late" : "pending",
      detail: `${contacts}/${WEEKLY_CONTACTS} contacts · ${rdv}/${WEEKLY_RDV} RDV`,
    },
    {
      key: "reports",
      label: "CR sous 48 h",
      status: missingReports === 0 ? "ok" : "late",
      detail:
        missingReports === 0
          ? "Tous les comptes rendus sont saisis"
          : `${plural(missingReports, "RDV", "RDV")} sans compte rendu ou prochaine action`,
    },
    {
      key: "proposals",
      label: "Proposition sous 5 j",
      status: lateProposals === 0 ? "ok" : "late",
      detail:
        lateProposals === 0
          ? "Aucune proposition en retard"
          : `${plural(lateProposals, "proposition", "propositions")} à envoyer depuis plus de 5 jours ouvrés après le RDV`,
    },
    {
      key: "expenses",
      label: "Dépenses",
      status: weekExpenses > 0 ? "ok" : "pending",
      detail:
        weekExpenses > 0
          ? `${plural(weekExpenses, "dépense saisie", "dépenses saisies")} cette semaine`
          : "Aucune dépense saisie cette semaine",
    },
  ];
}
