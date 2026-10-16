import type { CrmPipelineStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/resend";
import {
  escapeHtml,
  requireResendApiKey,
  resendErrorMessage,
  resolveCabinetMailAddresses,
} from "@/lib/email";
import { absoluteAppUrl } from "@/lib/app-url";
import { ACTIVE_STAGES, STAGE_LABELS, type PipelineStage } from "@/lib/prospection-model";

export type CrmReminderKind = "before" | "after";

export type CrmReminderJobResult = {
  before: number;
  after: number;
  skipped: number;
  errors: string[];
};

const DAY_MS = 86_400_000;
const REMINDER_OFFSET_DAYS = 2;
/** Au-delà, une échéance dépassée n'est plus relancée (évite un rattrapage massif). */
const AFTER_CATCH_UP_DAYS = 7;
const OPPORTUNITIES_PATH = "/prospection/opportunites";

const reminderInclude = {
  company: { select: { name: true } },
  reminders: { select: { kind: true, dueDate: true } },
} as const;

function todayUtcDate(ref: Date): Date {
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

function formatDateFr(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export async function resolveProspectionSender(): Promise<{ from: string; replyTo?: string }> {
  const companies = await prisma.company.findMany({
    where: { mailFromEmail: { not: null } },
    select: { cabinet: true, mailFromEmail: true, mailReplyTo: true },
  });
  const company =
    companies.find((c) => c.cabinet === "expertise_fiscale" && c.mailFromEmail?.trim()) ??
    companies.find((c) => c.mailFromEmail?.trim());
  const { from, replyTo } = resolveCabinetMailAddresses({
    name: "2R Hub — Prospection",
    email: "",
    mailFromEmail: company?.mailFromEmail,
    mailReplyTo: company?.mailReplyTo,
  });
  return { from, replyTo };
}

type ReminderContent = {
  kind: CrmReminderKind;
  firstName: string;
  companyName: string;
  title: string;
  stage: CrmPipelineStage;
  nextAction: string;
  dueDate: Date;
  daysDelta: number;
};

function reminderSubject(c: ReminderContent): string {
  if (c.kind === "before") {
    const when = c.daysDelta <= 1 ? "demain" : `dans ${c.daysDelta} jours`;
    return `Rappel : prochaine étape ${when} — ${c.companyName}`;
  }
  return `Tâche en retard — ${c.companyName} (${STAGE_LABELS[c.stage as PipelineStage]})`;
}

function reminderBody(c: ReminderContent): string {
  const stageLabel = STAGE_LABELS[c.stage as PipelineStage];
  const action = c.nextAction.trim() || "Prochaine action";
  if (c.kind === "before") {
    const when = c.daysDelta <= 1 ? "demain" : `dans ${c.daysDelta} jours`;
    return `« ${action} » est prévue ${when} (${formatDateFr(c.dueDate)}) pour l'opportunité « ${c.title} » — étape ${stageLabel}.`;
  }
  return `« ${action} » était prévue le ${formatDateFr(c.dueDate)} pour l'opportunité « ${c.title} », mais l'étape n'a pas évolué (toujours ${stageLabel}). Mettez à jour l'opportunité ou replanifiez la prochaine action.`;
}

function reminderHtml(c: ReminderContent, link: string): string {
  const accent = c.kind === "before" ? "#2563eb" : "#dc2626";
  const heading =
    c.kind === "before" ? "Prochaine étape à venir" : "Prochaine étape non réalisée";
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="padding:20px 24px;background:${accent};color:#ffffff">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">Prospection</div>
      <div style="font-size:20px;font-weight:bold;margin-top:4px">${escapeHtml(heading)}</div>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 16px">Bonjour ${escapeHtml(c.firstName)},</p>
      <p style="margin:0 0 20px;line-height:1.5">${escapeHtml(reminderBody(c))}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr><td style="padding:6px 0;color:#6b7280;width:40%">Entreprise</td><td style="padding:6px 0;font-weight:bold">${escapeHtml(c.companyName)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Opportunité</td><td style="padding:6px 0">${escapeHtml(c.title)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Étape</td><td style="padding:6px 0">${escapeHtml(STAGE_LABELS[c.stage as PipelineStage])}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Action prévue</td><td style="padding:6px 0">${escapeHtml(c.nextAction.trim() || "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Échéance</td><td style="padding:6px 0">${escapeHtml(formatDateFr(c.dueDate))}</td></tr>
      </table>
      <a href="${escapeHtml(link)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Ouvrir l'opportunité</a>
    </div>
  </div>
</body></html>`;
}

export async function runCrmOpportunityReminders(options?: {
  refDate?: Date;
}): Promise<CrmReminderJobResult> {
  requireResendApiKey();
  const today = todayUtcDate(options?.refDate ?? new Date());
  const activeStages = ACTIVE_STAGES as CrmPipelineStage[];
  const result: CrmReminderJobResult = { before: 0, after: 0, skipped: 0, errors: [] };

  const [upcoming, overdue] = await Promise.all([
    prisma.crmOpportunity.findMany({
      where: {
        stage: { in: activeStages },
        nextActionOn: { gte: addDays(today, 1), lte: addDays(today, REMINDER_OFFSET_DAYS) },
      },
      include: reminderInclude,
    }),
    prisma.crmOpportunity.findMany({
      where: {
        stage: { in: activeStages },
        nextActionOn: {
          gte: addDays(today, -AFTER_CATCH_UP_DAYS),
          lte: addDays(today, -REMINDER_OFFSET_DAYS),
        },
      },
      include: reminderInclude,
    }),
  ]);

  const alreadySent = (opp: (typeof upcoming)[number], kind: CrmReminderKind) =>
    opp.reminders.some(
      (r) => r.kind === kind && r.dueDate.getTime() === opp.nextActionOn?.getTime(),
    );

  const candidates: { opp: (typeof upcoming)[number]; kind: CrmReminderKind }[] = [
    ...upcoming
      .filter((opp) => !alreadySent(opp, "before"))
      .map((opp) => ({ opp, kind: "before" as const })),
    ...overdue
      .filter((opp) => !alreadySent(opp, "after"))
      .filter((opp) => {
        // Étape modifiée depuis le rappel J-2 : la tâche a été traitée.
        const windowStart = addDays(opp.nextActionOn!, -REMINDER_OFFSET_DAYS);
        return !opp.stageChangedAt || opp.stageChangedAt < windowStart;
      })
      .map((opp) => ({ opp, kind: "after" as const })),
  ];
  if (candidates.length === 0) return result;

  const ownerIds = [...new Set(candidates.map((c) => c.opp.ownerId))];
  const owners = await prisma.staffMember.findMany({
    where: { id: { in: ownerIds } },
    select: { id: true, email: true, firstName: true },
  });
  const ownerById = new Map(owners.map((o) => [o.id, o]));
  const sender = await resolveProspectionSender();
  const resend = getResend();
  const link = absoluteAppUrl(OPPORTUNITIES_PATH);

  for (const { opp, kind } of candidates) {
    const owner = ownerById.get(opp.ownerId);
    const email = owner?.email?.trim();
    if (!owner || !email || !opp.nextActionOn) {
      result.skipped++;
      continue;
    }

    const dueDate = opp.nextActionOn;
    let logId: string;
    try {
      const log = await prisma.crmReminderLog.create({
        data: {
          opportunityId: opp.id,
          kind,
          dueDate,
          stage: opp.stage,
          staffId: owner.id,
          toEmail: email,
        },
        select: { id: true },
      });
      logId = log.id;
    } catch {
      // Contrainte unique : déjà envoyé (exécution concurrente).
      result.skipped++;
      continue;
    }

    const content: ReminderContent = {
      kind,
      firstName: owner.firstName,
      companyName: opp.company.name,
      title: opp.title,
      stage: opp.stage,
      nextAction: opp.nextAction,
      dueDate,
      daysDelta: Math.round(Math.abs(dueDate.getTime() - today.getTime()) / DAY_MS),
    };

    try {
      const subject = reminderSubject(content);
      const { error } = await resend.emails.send({
        from: sender.from,
        to: email,
        subject,
        html: reminderHtml(content, link),
        ...(sender.replyTo ? { replyTo: [sender.replyTo] } : {}),
      });
      if (error) throw new Error(resendErrorMessage(error));

      await prisma.crmNotification.create({
        data: {
          cabinet: opp.cabinet,
          staffId: owner.id,
          title: kind === "before" ? "Échéance dans 2 jours" : "Tâche en retard",
          body: `${opp.company.name} — ${reminderBody(content)}`,
          href: OPPORTUNITIES_PATH,
        },
      });

      if (kind === "before") result.before++;
      else result.after++;
    } catch (err) {
      await prisma.crmReminderLog.delete({ where: { id: logId } }).catch(() => {});
      result.errors.push(
        `${opp.company.name} / ${opp.title}: ${err instanceof Error ? err.message : "échec"}`,
      );
    }
  }

  return result;
}
