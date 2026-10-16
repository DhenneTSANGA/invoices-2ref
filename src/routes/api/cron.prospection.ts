import { createFileRoute } from "@tanstack/react-router";
import { runCrmOpportunityReminders } from "@/lib/crm-reminder-jobs";
import { runCrmWeeklyReport, type CrmWeeklyReportResult } from "@/lib/crm-weekly-report";
import { runCrmDailyDigest, type CrmDailyDigestResult } from "@/lib/crm-daily-digest";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

export const Route = createFileRoute("/api/cron/prospection")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorizeCron(request)) {
          return Response.json({ error: "Non autorisé" }, { status: 401 });
        }

        try {
          let refDate: Date | undefined;
          let forceWeeklyReport = false;
          try {
            const body = (await request.json()) as { refDate?: string; weeklyReport?: boolean };
            if (body.refDate?.trim()) {
              refDate = new Date(`${body.refDate.trim().slice(0, 10)}T12:00:00.000Z`);
            }
            forceWeeklyReport = body.weeklyReport === true;
          } catch {
            /* corps vide — exécution à la date du jour */
          }

          const result = await runCrmOpportunityReminders(refDate ? { refDate } : undefined);
          console.info("[cron/prospection]", JSON.stringify(result));
          let weeklyReport: CrmWeeklyReportResult | { error: string };
          try {
            weeklyReport = await runCrmWeeklyReport({ refDate, force: forceWeeklyReport });
            console.info("[cron/prospection] weekly report", JSON.stringify(weeklyReport));
          } catch (err) {
            console.error("[cron/prospection] weekly report", err);
            weeklyReport = { error: err instanceof Error ? err.message : "Erreur serveur" };
          }
          let dailyDigest: CrmDailyDigestResult | { error: string };
          try {
            dailyDigest = await runCrmDailyDigest(refDate ? { refDate } : undefined);
            console.info("[cron/prospection] daily digest", JSON.stringify(dailyDigest));
          } catch (err) {
            console.error("[cron/prospection] daily digest", err);
            dailyDigest = { error: err instanceof Error ? err.message : "Erreur serveur" };
          }
          return Response.json({ ok: true, ...result, weeklyReport, dailyDigest });
        } catch (err) {
          console.error("[cron/prospection]", err);
          return Response.json(
            { error: err instanceof Error ? err.message : "Erreur serveur" },
            { status: 500 },
          );
        }
      },
    },
  },
});
