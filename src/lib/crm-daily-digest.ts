import type { CrmActivityStatus, CrmPipelineStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/resend";
import { escapeHtml, requireResendApiKey, resendErrorMessage } from "@/lib/email";
import { absoluteAppUrl } from "@/lib/app-url";
import { mapStaff } from "@/lib/mappers";
import { resolveProspectionSender } from "@/lib/crm-reminder-jobs";
import { carriesPortfolio, isProspectionAssignableStaff } from "@/lib/prospection-managers";
import { crmRoleFromStaff } from "@/lib/prospection-access";
import { ACTIVE_STAGES, STAGE_LABELS, type PipelineStage } from "@/lib/prospection-model";
import { CABINETS, CABINET_LABELS, type Cabinet } from "@/lib/cabinets";
import type { StaffMember } from "@/store/types";

/**
 * Récapitulatif du matin envoyé à chaque manager (jours ouvrés) : tâches en retard,
 * programme du jour et oublis de la routine (compte rendu sous 48 h, proposition
 * sous 5 jours ouvrés, pistes non traitées). Un seul mail par jour plutôt qu’un
 * rappel par tâche ; rien n’est envoyé quand il n’y a rien à signaler.
 */

const DAY_MS = 86_400_000;
const OPEN_STATUSES: CrmActivityStatus[] = ["a_faire", "planifiee", "en_cours", "en_retard"];
/** Retards plus anciens ignorés (évite de traîner indéfiniment de vieilles tâches). */
const OVERDUE_WINDOW_DAYS = 30;
/** Compte rendu attendu sous 48 h après un RDV. */
const REPORT_DELAY_DAYS = 2;
/** Fenêtre de contrôle des comptes rendus. */
const REPORT_WINDOW_DAYS = 14;
/** Proposition attendue sous 5 jours ouvrés après le RDV. */
const PROPOSAL_BUSINESS_DAYS = 5;
/** Piste encore « nouvelle » au-delà : non traitée. */
const LEAD_IDLE_DAYS = 3;
/** Retard au-delà duquel la direction est informée (rapport du lundi). */
export const ESCALATION_DAYS = 7;

const ACTIVITY_KIND_LABELS: Record<string, string> = {
  appel: "Appel",
  email: "E-mail",
  visite: "Visite",
  rdv: "RDV",
  evenement: "Événement",
};

export type DigestItem = { title: string; detail: string; date?: Date };

export type ManagerDigest = {
  overdue: DigestItem[];
  today: DigestItem[];
  missingReports: DigestItem[];
  lateProposals: DigestItem[];
  idleLeads: DigestItem[];
};

export type CrmDailyDigestResult =
  | { status: "skipped"; reason: string }
  | {
      status: "done";
      day: string;
      sent: number;
      empty: number;
      skipped: number;
      errors: string[];
      /** Mode test : contenu calculé, aucun mail envoyé. */
      preview?: { cabinet: Cabinet; to: string; items: number; html: string }[];
    };

function libreville(ref: Date): Date {
  // Africa/Libreville = UTC+1, sans heure d’été.
  return new Date(ref.getTime() + 3600_000);
}

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

/** Ajoute des jours ouvrés (lundi → vendredi). */
function addBusinessDays(d: Date, days: number): Date {
  let out = utcDay(d);
  let left = days;
  while (left > 0) {
    out = addDays(out, 1);
    const wd = out.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return out;
}

function frDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

function lateBy(date: Date, today: Date): string {
  const days = Math.round((today.getTime() - utcDay(date).getTime()) / DAY_MS);
  return days <= 1 ? "en retard d’1 jour" : `en retard de ${days} jours`;
}

/** Porteurs de portefeuille d’un cabinet (mêmes règles que le rapport hebdomadaire). */
export function cabinetPortfolioManagers(staff: StaffMember[], cabinet: Cabinet): StaffMember[] {
  const assignable = staff.filter(
    (s) => isProspectionAssignableStaff(s) && (s.role === "super_admin" || s.cabinet === cabinet),
  );
  const designated = assignable.filter(carriesPortfolio);
  return designated.length > 0
    ? designated
    : assignable.filter((s) => crmRoleFromStaff(s) !== "direction");
}

export function digestCount(d: ManagerDigest): number {
  return (
    d.overdue.length +
    d.today.length +
    d.missingReports.length +
    d.lateProposals.length +
    d.idleLeads.length
  );
}

/** Calcule le récapitulatif d’un manager pour un cabinet, à la date `today` (minuit UTC). */
export async function computeManagerDigest(
  ownerId: string,
  cabinet: Cabinet,
  today: Date,
): Promise<ManagerDigest> {
  const activeStages = ACTIVE_STAGES as CrmPipelineStage[];
  const [openActs, rdvs, opps, leads] = await Promise.all([
    prisma.crmActivity.findMany({
      where: {
        cabinet,
        ownerId,
        status: { in: OPEN_STATUSES },
        at: { gte: addDays(today, -OVERDUE_WINDOW_DAYS), lte: today },
      },
      include: { company: { select: { name: true } } },
      orderBy: [{ at: "asc" }, { time: "asc" }],
    }),
    prisma.crmActivity.findMany({
      where: {
        cabinet,
        ownerId,
        kind: "rdv",
        status: { not: "annulee" },
        at: { gte: addDays(today, -REPORT_WINDOW_DAYS), lte: addDays(today, -REPORT_DELAY_DAYS) },
      },
      include: { company: { select: { name: true } } },
      orderBy: { at: "asc" },
    }),
    prisma.crmOpportunity.findMany({
      where: { cabinet, ownerId, stage: { in: activeStages } },
      include: { company: { select: { name: true } } },
    }),
    prisma.crmLead.findMany({
      where: { cabinet, ownerId, status: "nouvelle", at: { lt: addDays(today, -LEAD_IDLE_DAYS) } },
      orderBy: { at: "asc" },
    }),
  ]);

  const actItem = (a: (typeof openActs)[number], late: boolean): DigestItem => ({
    title: `${ACTIVITY_KIND_LABELS[a.kind] ?? a.kind} — ${a.company.name}`,
    detail: [a.title, a.time ? `à ${a.time}` : "", late ? lateBy(a.at, today) : ""]
      .filter(Boolean)
      .join(" · "),
    date: a.at,
  });

  // Une prochaine action d’opportunité déjà couverte par une action d’agenda n’est pas doublée.
  const covered = new Set(openActs.filter((a) => a.opportunityId).map((a) => a.opportunityId));
  const withNext = opps.filter(
    (o) =>
      o.nextActionOn &&
      !covered.has(o.id) &&
      o.nextActionOn >= addDays(today, -OVERDUE_WINDOW_DAYS) &&
      o.nextActionOn <= today,
  );
  const oppItem = (o: (typeof opps)[number], late: boolean): DigestItem => ({
    title: `${o.company.name} — ${o.title}`,
    detail: [
      o.nextAction.trim() || "Prochaine action à mener",
      STAGE_LABELS[o.stage as PipelineStage],
      late && o.nextActionOn ? lateBy(o.nextActionOn, today) : "",
    ]
      .filter(Boolean)
      .join(" · "),
    date: o.nextActionOn ?? undefined,
  });

  const isToday = (d: Date) => utcDay(d).getTime() === today.getTime();
  const overdue = [
    ...openActs.filter((a) => !isToday(a.at)).map((a) => actItem(a, true)),
    ...withNext.filter((o) => !isToday(o.nextActionOn!)).map((o) => oppItem(o, true)),
  ].sort((x, y) => (x.date?.getTime() ?? 0) - (y.date?.getTime() ?? 0));
  const todayItems = [
    ...openActs.filter((a) => isToday(a.at)).map((a) => actItem(a, false)),
    ...withNext.filter((o) => isToday(o.nextActionOn!)).map((o) => oppItem(o, false)),
  ];

  const missingReports = rdvs
    .filter((a) => a.status !== "terminee" || !a.summary.trim() || !a.nextAction?.trim())
    .map((a) => ({
      title: `RDV — ${a.company.name}`,
      detail: `${frDate(a.at)} · ${
        a.status !== "terminee"
          ? "RDV à clôturer avec son compte rendu"
          : !a.summary.trim()
            ? "compte rendu manquant"
            : "prochaine action manquante"
      }`,
      date: a.at,
    }));

  const lateProposals = opps
    .filter(
      (o) =>
        o.stage === "rendez_vous" &&
        o.stageChangedAt &&
        addBusinessDays(o.stageChangedAt, PROPOSAL_BUSINESS_DAYS) < today,
    )
    .map((o) => ({
      title: `${o.company.name} — ${o.title}`,
      detail: `RDV depuis le ${frDate(o.stageChangedAt!)} · proposition attendue sous ${PROPOSAL_BUSINESS_DAYS} jours ouvrés`,
      date: o.stageChangedAt!,
    }));

  const idleLeads = leads.map((l) => ({
    title: `Piste — ${l.companyName}`,
    detail: `reçue le ${frDate(l.at)} · ${l.need.trim() || "besoin à qualifier"}`,
    date: l.at,
  }));

  return { overdue, today: todayItems, missingReports, lateProposals, idleLeads };
}

export async function runCrmDailyDigest(options?: {
  refDate?: Date;
  force?: boolean;
  /** Calcule et renvoie les mails sans rien envoyer ni journaliser. */
  dryRun?: boolean;
}): Promise<CrmDailyDigestResult> {
  const local = libreville(options?.refDate ?? new Date());
  const weekday = local.getUTCDay();
  if (!options?.force && (weekday === 0 || weekday === 6)) {
    return { status: "skipped", reason: "week-end" };
  }
  const today = utcDay(local);
  const day = today.toISOString().slice(0, 10);
  if (!options?.dryRun) requireResendApiKey();

  const staff = (await prisma.staffMember.findMany()).map(mapStaff);
  const result: Extract<CrmDailyDigestResult, { status: "done" }> = {
    status: "done",
    day,
    sent: 0,
    empty: 0,
    skipped: 0,
    errors: [],
    ...(options?.dryRun ? { preview: [] } : {}),
  };
  const sender = options?.dryRun ? null : await resolveProspectionSender();
  const link = absoluteAppUrl("/prospection");

  for (const cabinet of CABINETS) {
    for (const manager of cabinetPortfolioManagers(staff, cabinet)) {
      const email = manager.email?.trim();
      if (!email) {
        result.skipped++;
        continue;
      }
      try {
        const digest = await computeManagerDigest(manager.id, cabinet, today);
        const items = digestCount(digest);
        if (items === 0) {
          result.empty++;
          continue;
        }
        const late =
          digest.overdue.length +
          digest.missingReports.length +
          digest.lateProposals.length +
          digest.idleLeads.length;
        const subject =
          late > 0
            ? `Prospection ${CABINET_LABELS[cabinet]} — ${late} point(s) en attente, ${digest.today.length} prévu(s) aujourd’hui`
            : `Prospection ${CABINET_LABELS[cabinet]} — votre programme du jour (${digest.today.length})`;
        const html = digestHtml({
          firstName: manager.firstName,
          cabinetLabel: CABINET_LABELS[cabinet],
          today,
          digest,
          link,
        });

        if (options?.dryRun) {
          result.preview!.push({ cabinet, to: email, items, html });
          continue;
        }

        const log = await prisma.crmDailyDigest
          .create({ data: { cabinet, staffId: manager.id, day, toEmail: email, items } })
          .catch(() => null);
        if (!log) {
          result.skipped++; // déjà envoyé aujourd’hui (exécution répétée)
          continue;
        }
        try {
          const { error } = await getResend().emails.send({
            from: sender!.from,
            to: email,
            subject,
            html,
            ...(sender!.replyTo ? { replyTo: [sender!.replyTo] } : {}),
          });
          if (error) throw new Error(resendErrorMessage(error));
          result.sent++;
        } catch (err) {
          await prisma.crmDailyDigest.delete({ where: { id: log.id } }).catch(() => {});
          throw err;
        }
      } catch (err) {
        result.errors.push(`${email}: ${err instanceof Error ? err.message : "échec"}`);
      }
    }
  }
  return result;
}

function digestHtml(input: {
  firstName: string;
  cabinetLabel: string;
  today: Date;
  digest: ManagerDigest;
  link: string;
}): string {
  const { digest } = input;
  const section = (title: string, color: string, hint: string, items: DigestItem[]) =>
    items.length === 0
      ? ""
      : `
      <div style="margin-bottom:20px">
        <div style="font-size:13px;font-weight:bold;color:${color};text-transform:uppercase;letter-spacing:.04em">${escapeHtml(title)} (${items.length})</div>
        <div style="font-size:12px;color:#6b7280;margin:2px 0 8px">${escapeHtml(hint)}</div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${items
            .slice(0, 12)
            .map(
              (i) => `<tr><td style="padding:8px 10px;border-left:3px solid ${color};background:#f9fafb;border-bottom:4px solid #ffffff">
                <div style="font-weight:bold;color:#111827">${escapeHtml(i.title)}</div>
                <div style="font-size:12px;color:#4b5563;margin-top:2px">${escapeHtml(i.detail)}</div>
              </td></tr>`,
            )
            .join("")}
          ${items.length > 12 ? `<tr><td style="padding:4px 10px;font-size:12px;color:#6b7280">… et ${items.length - 12} autre(s)</td></tr>` : ""}
        </table>
      </div>`;

  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(input.today);
  const dateTitle = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="padding:20px 24px;background:#1e3a8a;color:#ffffff">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">Prospection ${escapeHtml(input.cabinetLabel)} — récapitulatif du jour</div>
      <div style="font-size:20px;font-weight:bold;margin-top:4px">${escapeHtml(dateTitle)}</div>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 20px;font-size:15px">Bonjour ${escapeHtml(input.firstName)}, voici ce qui demande votre attention aujourd’hui.</p>
      ${section("En retard", "#dc2626", "Actions prévues non réalisées : à faire ou à replanifier.", digest.overdue)}
      ${section("Comptes rendus manquants", "#d97706", "Chaque RDV doit être clôturé avec son compte rendu et sa prochaine action sous 48 h.", digest.missingReports)}
      ${section("Propositions à envoyer", "#7c3aed", "Après un RDV, la proposition est attendue sous 5 jours ouvrés.", digest.lateProposals)}
      ${section("Pistes non traitées", "#0891b2", `Pistes reçues il y a plus de ${LEAD_IDLE_DAYS} jours, toujours au statut « nouvelle ».`, digest.idleLeads)}
      ${section("Au programme aujourd’hui", "#1e3a8a", "Actions planifiées et prochaines actions du jour.", digest.today)}
      <a href="${escapeHtml(input.link)}" style="display:inline-block;background:#1e3a8a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Ouvrir ma prospection</a>
      <p style="margin:20px 0 0;font-size:11px;color:#9ca3af">Les retards de plus de ${ESCALATION_DAYS} jours sont signalés à la direction dans la synthèse du lundi.</p>
    </div>
  </div>
</body></html>`;
}
