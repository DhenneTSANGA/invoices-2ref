import { createFileRoute } from "@tanstack/react-router";
import { runBillingJobs } from "@/lib/billing-jobs";

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
          return Response.json({ ok: true, ...result });
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
