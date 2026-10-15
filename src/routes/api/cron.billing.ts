import { createFileRoute } from "@tanstack/react-router";
import { runBillingJobs } from "@/lib/billing-jobs";
import {
  runCrmOpportunityReminders,
  type CrmReminderJobResult,
} from "@/lib/crm-reminder-jobs";
import { runCrmWeeklyReport, type CrmWeeklyReportResult } from "@/lib/crm-weekly-report";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

export const Route = createFileRoute("/api/cron/billing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorizeCron(request)) {
          return Response.json({ error: "Non autorisé" }, { status: 401 });
        }

        try {
          let refDate: Date | undefined;
          try {
            const body = (await request.json()) as { refDate?: string };
            if (body.refDate?.trim()) {
              refDate = new Date(`${body.refDate.trim().slice(0, 10)}T12:00:00.000Z`);
            }
          } catch {
            /* corps vide — exécution à la date du jour */
          }

          const result = await runBillingJobs(refDate ? { refDate } : undefined);
          console.info("[cron/billing]", JSON.stringify(result));
          let crmReminders: CrmReminderJobResult | { error: string };
          try {
            crmReminders = await runCrmOpportunityReminders(refDate ? { refDate } : undefined);
            console.info("[cron/billing] crm reminders", JSON.stringify(crmReminders));
          } catch (err) {
            console.error("[cron/billing] crm reminders", err);
            crmReminders = { error: err instanceof Error ? err.message : "Erreur serveur" };
          }
          // Rapport hebdomadaire Prospection à la direction (lundi, idempotent).
          let crmWeeklyReport: CrmWeeklyReportResult | { error: string };
          try {
            crmWeeklyReport = await runCrmWeeklyReport(refDate ? { refDate } : undefined);
            console.info("[cron/billing] crm weekly report", JSON.stringify(crmWeeklyReport));
          } catch (err) {
            console.error("[cron/billing] crm weekly report", err);
            crmWeeklyReport = { error: err instanceof Error ? err.message : "Erreur serveur" };
          }
          return Response.json({ ok: true, ...result, crmReminders, crmWeeklyReport });
        } catch (err) {
          console.error("[cron/billing]", err);
          return Response.json(
            { error: err instanceof Error ? err.message : "Erreur serveur" },
            { status: 500 },
          );
        }
      },
    },
  },
});
