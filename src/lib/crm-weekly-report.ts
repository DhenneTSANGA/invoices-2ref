import type { CrmServiceLine } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/resend";
import { escapeHtml, requireResendApiKey, resendErrorMessage } from "@/lib/email";
import { absoluteAppUrl } from "@/lib/app-url";
import { mapStaff } from "@/lib/mappers";
import { resolveProspectionSender } from "@/lib/crm-reminder-jobs";
import {
  carriesPortfolio,
  isProspectionAssignableStaff,
  staffDisplayName,
} from "@/lib/prospection-managers";
import { crmRoleFromStaff } from "@/lib/prospection-access";
import { ACTIVE_STAGES, type PipelineStage } from "@/lib/prospection-model";
import { CABINETS, CABINET_LABELS, type Cabinet } from "@/lib/cabinets";
import { computeManagerDigest, ESCALATION_DAYS, type DigestItem } from "@/lib/crm-daily-digest";

/**
 * Rapport de synthèse hebdomadaire envoyé à la direction chaque lundi matin
 * (cahier des charges §6) : semaine écoulée, par manager et pour le cabinet.
 */

type CabinetReportResult =
  | { status: "sent"; weekKey: string; recipients: number }
  | { status: "skipped"; reason: string };

export type CrmWeeklyReportResult =
  | { status: "done"; weekKey: string; cabinets: Partial<Record<Cabinet, CabinetReportResult>> }
  | { status: "skipped"; reason: string };

const DAY_MS = 86_400_000;
/** Rattrapage si le cron du lundi n’a pas tourné (lundi → mercredi). */
const CATCH_UP_WEEKDAYS = new Set([1, 2, 3]);

/** Retards de plus de ESCALATION_DAYS jours d’un manager (escalade vers la direction). */
type EscalationRow = { name: string; items: DigestItem[] };

type ManagerRow = {
  name: string;
  actions: number;
  qualified: number;
  rdv: number;
  proposals: number;
  proposalsAmount: number;
  signatures: number;
  signedAmount: number;
  budgetSpent: number;
};

function libreville(ref: Date): Date {
  // Africa/Libreville = UTC+1, sans heure d’été.
  return new Date(ref.getTime() + 3600_000);
}

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fcfa(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}

function frDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(d);
}

export async function runCrmWeeklyReport(options?: {
  refDate?: Date;
  force?: boolean;
}): Promise<CrmWeeklyReportResult> {
  const local = libreville(options?.refDate ?? new Date());
  const weekday = local.getUTCDay();
  if (!options?.force && !CATCH_UP_WEEKDAYS.has(weekday)) {
    return { status: "skipped", reason: "pas un lundi" };
  }

  const today = utcDay(local);
  const thisMonday = new Date(today.getTime() - ((weekday + 6) % 7) * DAY_MS);
  const weekStart = new Date(thisMonday.getTime() - 7 * DAY_MS);
  const weekEnd = thisMonday; // exclusif
  const weekKey = isoDay(weekStart);

  // Un rapport par cabinet (Prospection cloisonnée comme la Facturation).
  const cabinets: Partial<Record<Cabinet, CabinetReportResult>> = {};
  for (const cabinet of CABINETS) {
    cabinets[cabinet] = await sendCabinetReport(cabinet, weekKey, weekStart, weekEnd);
  }
  return { status: "done", weekKey, cabinets };
}

async function sendCabinetReport(
  cabinet: Cabinet,
  weekKey: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<CabinetReportResult> {
  if (
    await prisma.crmWeeklyReport.findUnique({
      where: { weekKey_cabinet: { weekKey, cabinet } },
    })
  ) {
    return { status: "skipped", reason: `rapport déjà envoyé (${weekKey})` };
  }

  const staff = (await prisma.staffMember.findMany()).map(mapStaff);
  // Destinataires : super admins (les deux cabinets) et la direction de ce cabinet.
  const directionEmails = staff
    .filter(
      (s) =>
        s.role === "super_admin" ||
        (s.role === "admin" && s.cabinet === cabinet && crmRoleFromStaff(s) === "direction"),
    )
    .map((s) => s.email.trim())
    .filter(Boolean);
  if (directionEmails.length === 0) {
    return { status: "skipped", reason: "aucun destinataire direction" };
  }
  const assignable = staff.filter(
    (s) => isProspectionAssignableStaff(s) && (s.role === "super_admin" || s.cabinet === cabinet),
  );
  const designated = assignable.filter(carriesPortfolio);
  const managers =
    designated.length > 0
      ? designated
      : assignable.filter((s) => crmRoleFromStaff(s) !== "direction");

  // Budget du mois auquel appartient le dimanche de la semaine écoulée.
  const lastDay = new Date(weekEnd.getTime() - DAY_MS);
  const monthStart = new Date(Date.UTC(lastDay.getUTCFullYear(), lastDay.getUTCMonth(), 1));
  const inWeek = { gte: weekStart, lt: weekEnd };
  const [activities, created, proposals, won, expenses, active, budget] = await Promise.all([
    prisma.crmActivity.findMany({
      where: { cabinet, at: inWeek, status: "terminee" },
      select: { ownerId: true, kind: true },
    }),
    prisma.crmOpportunity.findMany({
      where: { cabinet, qualifiedAt: inWeek },
      select: { ownerId: true },
    }),
    prisma.crmOpportunity.findMany({
      where: { cabinet, proposalAt: inWeek },
      select: { ownerId: true, amount: true },
    }),
    prisma.crmOpportunity.findMany({
      where: { cabinet, wonAt: inWeek },
      select: { ownerId: true, amount: true, line: true },
    }),
    prisma.crmExpense.findMany({
      where: { cabinet, at: { gte: monthStart, lt: weekEnd }, approval: { not: "rejected" } },
      select: { managerId: true, amount: true },
    }),
    prisma.crmOpportunity.findMany({
      where: { cabinet, stage: { in: ACTIVE_STAGES as PipelineStage[] } },
      select: { amount: true, probability: true, line: true },
    }),
    prisma.crmBudgetSettings.findUnique({ where: { id: cabinet } }),
  ]);
  const monthlyCap = Number(budget?.monthlyBudgetPerManager ?? 500000);

  const rows: ManagerRow[] = managers.map((m) => {
    const mine = <T extends { ownerId: string }>(list: T[]) =>
      list.filter((x) => x.ownerId === m.id);
    const acts = mine(activities);
    const props = mine(proposals);
    const signed = mine(won);
    return {
      name: staffDisplayName(m),
      actions: acts.length,
      qualified: mine(created).length,
      rdv: acts.filter((a) => a.kind === "rdv").length,
      proposals: props.length,
      proposalsAmount: props.reduce((s, o) => s + Number(o.amount), 0),
      signatures: signed.length,
      signedAmount: signed.reduce((s, o) => s + Number(o.amount), 0),
      budgetSpent: expenses
        .filter((e) => e.managerId === m.id)
        .reduce((s, e) => s + Number(e.amount), 0),
    };
  });

  const total = rows.reduce(
    (t, r) => ({
      actions: t.actions + r.actions,
      qualified: t.qualified + r.qualified,
      rdv: t.rdv + r.rdv,
      proposals: t.proposals + r.proposals,
      proposalsAmount: t.proposalsAmount + r.proposalsAmount,
      signatures: t.signatures + r.signatures,
      signedAmount: t.signedAmount + r.signedAmount,
      budgetSpent: t.budgetSpent + r.budgetSpent,
    }),
    {
      actions: 0,
      qualified: 0,
      rdv: 0,
      proposals: 0,
      proposalsAmount: 0,
      signatures: 0,
      signedAmount: 0,
      budgetSpent: 0,
    },
  );
  const notTraining = (l: CrmServiceLine) => l !== "formation";
  const pipeline = active.reduce((s, o) => s + Number(o.amount), 0);
  const weighted = active.reduce((s, o) => s + (Number(o.amount) * o.probability) / 100, 0);
  const counselPipe = active
    .filter((o) => notTraining(o.line))
    .reduce((s, o) => s + Number(o.amount), 0);
  const counselShare = pipeline > 0 ? Math.round((counselPipe / pipeline) * 100) : 0;
  const budgetCap = monthlyCap * Math.max(1, managers.length);

  // Escalade : tâches et oublis de la routine en souffrance depuis plus de 7 jours.
  const escalationLimit = new Date(weekEnd.getTime() - ESCALATION_DAYS * DAY_MS);
  const escalations: EscalationRow[] = (
    await Promise.all(
      managers.map(async (m) => {
        const d = await computeManagerDigest(m.id, cabinet, weekEnd);
        const items = [...d.overdue, ...d.missingReports, ...d.lateProposals, ...d.idleLeads].filter(
          (i) => i.date && i.date < escalationLimit,
        );
        return { name: staffDisplayName(m), items };
      }),
    )
  ).filter((e) => e.items.length > 0);

  const period = `du ${frDate(weekStart)} au ${frDate(new Date(weekEnd.getTime() - DAY_MS))}`;
  const html = weeklyReportHtml({
    escalations,
    cabinetLabel: CABINET_LABELS[cabinet],
    period,
    rows,
    total,
    weighted,
    counselShare,
    budgetCap,
    monthlyCap,
    link: absoluteAppUrl("/prospection/kpi"),
  });

  requireResendApiKey();
  const log = await prisma.crmWeeklyReport
    .create({ data: { weekKey, cabinet, recipients: directionEmails } })
    .catch(() => null);
  if (!log) return { status: "skipped", reason: `rapport déjà envoyé (${weekKey})` };

  try {
    const sender = await resolveProspectionSender();
    const { error } = await getResend().emails.send({
      from: sender.from,
      to: directionEmails,
      subject: `Prospection ${CABINET_LABELS[cabinet]} — synthèse de la semaine ${period}`,
      html,
      ...(sender.replyTo ? { replyTo: [sender.replyTo] } : {}),
    });
    if (error) throw new Error(resendErrorMessage(error));
  } catch (err) {
    await prisma.crmWeeklyReport.delete({ where: { id: log.id } }).catch(() => {});
    throw err;
  }

  return { status: "sent", weekKey, recipients: directionEmails.length };
}

function weeklyReportHtml(input: {
  escalations: EscalationRow[];
  cabinetLabel: string;
  period: string;
  rows: ManagerRow[];
  total: Omit<ManagerRow, "name">;
  weighted: number;
  counselShare: number;
  budgetCap: number;
  monthlyCap: number;
  link: string;
}): string {
  const td = 'style="padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:right"';
  const tdl = 'style="padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:left"';
  const th =
    'style="padding:8px 6px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em"';
  const line = (r: Omit<ManagerRow, "name">, name: string, bold = false, cap = input.monthlyCap) => `
    <tr${bold ? ' style="font-weight:bold;background:#f9fafb"' : ""}>
      <td ${tdl}>${escapeHtml(name)}</td>
      <td ${td}>${r.actions}</td>
      <td ${td}>${r.qualified}</td>
      <td ${td}>${r.rdv}</td>
      <td ${td}>${r.proposals}<br><span style="font-size:11px;color:#6b7280">${fcfa(r.proposalsAmount)}</span></td>
      <td ${td}>${r.signatures}<br><span style="font-size:11px;color:#6b7280">${fcfa(r.signedAmount)}</span></td>
      <td ${td}>${cap > 0 ? Math.round((r.budgetSpent / cap) * 100) : 0} %<br><span style="font-size:11px;color:#6b7280">${fcfa(r.budgetSpent)}</span></td>
    </tr>`;
  const body =
    input.rows.length > 0
      ? input.rows.map((r) => line(r, r.name)).join("") +
        line(input.total, "Cabinet", true, input.budgetCap)
      : `<tr><td ${tdl} colspan="7">Aucun manager Prospection configuré.</td></tr>`;

  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="padding:20px 24px;background:#1e3a8a;color:#ffffff">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">Prospection ${escapeHtml(input.cabinetLabel)} — rapport hebdomadaire</div>
      <div style="font-size:20px;font-weight:bold;margin-top:4px">Semaine ${escapeHtml(input.period)}</div>
    </div>
    <div style="padding:24px">
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
        <tr>
          <th style="padding:8px 6px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Manager</th>
          <th ${th}>Actions</th><th ${th}>Qualifiés</th><th ${th}>RDV</th>
          <th ${th}>Propositions</th><th ${th}>Signatures</th><th ${th}>Budget du mois</th>
        </tr>
        ${body}
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr><td style="padding:6px 0;color:#6b7280;width:55%">Pipeline pondéré (en cours)</td><td style="padding:6px 0;font-weight:bold">${fcfa(input.weighted)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Part hors formation dans le pipeline</td><td style="padding:6px 0;font-weight:bold">${input.counselShare} %</td></tr>
      </table>
      ${
        input.escalations.length > 0
          ? `<div style="margin-bottom:24px;padding:14px 16px;border:1px solid #fecaca;background:#fef2f2;border-radius:8px">
        <div style="font-size:13px;font-weight:bold;color:#b91c1c;text-transform:uppercase;letter-spacing:.04em">Retards de plus de ${ESCALATION_DAYS} jours</div>
        ${input.escalations
          .map(
            (e) => `<div style="margin-top:10px;font-size:14px"><strong>${escapeHtml(e.name)}</strong> — ${e.items.length} point(s)
            <ul style="margin:4px 0 0;padding-left:18px;font-size:12px;color:#4b5563">${e.items
              .slice(0, 5)
              .map((i) => `<li>${escapeHtml(i.title)} · ${escapeHtml(i.detail)}</li>`)
              .join("")}${e.items.length > 5 ? `<li>… et ${e.items.length - 5} autre(s)</li>` : ""}</ul></div>`,
          )
          .join("")}
      </div>`
          : ""
      }
      <a href="${escapeHtml(input.link)}" style="display:inline-block;background:#1e3a8a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Ouvrir le pilotage</a>
    </div>
  </div>
</body></html>`;
}
