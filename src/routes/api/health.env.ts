import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/prisma";

/**
 * Diagnostic de configuration (protégé par CRON_SECRET) : vérifie que l’auth
 * Supabase et la base Prisma pointent vers le même projet, sans exposer de secret.
 *   curl -H "x-cron-secret: <secret>" https://<app>/api/health/env
 */

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

/** Référence du projet Supabase (sous-domaine ou suffixe de l’utilisateur du pooler). */
function projectRef(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const fromUser = u.username.split(".")[1];
    if (fromUser) return fromUser;
    const sub = u.hostname.split(".")[0];
    return sub === "db" ? (u.hostname.split(".")[1] ?? null) : sub;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/health/env")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorize(request)) {
          return Response.json({ error: "Non autorisé" }, { status: 401 });
        }
        const authProject = projectRef(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL);
        const databaseProject = projectRef(process.env.DATABASE_URL);

        let database: Record<string, number> | { error: string };
        try {
          const [row] = await prisma.$queryRaw<
            { staff: number; auth_users: number; staff_without_auth: number }[]
          >`
            SELECT
              (SELECT count(*)::int FROM "staff_members") AS staff,
              (SELECT count(*)::int FROM auth.users) AS auth_users,
              (SELECT count(*)::int FROM "staff_members" s
                 WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id::text = s.id)) AS staff_without_auth
          `;
          database = row;
        } catch (err) {
          database = { error: err instanceof Error ? err.message : "Requête impossible" };
        }

        return Response.json({
          authProject,
          databaseProject,
          sameProject: Boolean(authProject && authProject === databaseProject),
          appUrl: process.env.APP_URL ?? null,
          cronSecretConfigured: true,
          resendConfigured: Boolean(process.env.RESEND_API_KEY),
          database,
        });
      },
    },
  },
});
