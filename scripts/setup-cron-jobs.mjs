/**
 * Planifie les tâches automatiques via Supabase (pg_cron + pg_net), quel que
 * soit l’hébergeur de l’application :
 *   - chaque jour à 07:00 (Libreville) : /api/cron/billing
 *     → abonnements, relances de paiement, rappels CRM, rapport du lundi.
 *
 * Usage :
 *   node scripts/setup-cron-jobs.mjs --url https://votre-app.exemple.com
 *   (CRON_SECRET lu dans .env ; il doit être identique à celui de la production)
 *   node scripts/setup-cron-jobs.mjs --list
 *   node scripts/setup-cron-jobs.mjs --remove
 */
import "dotenv/config";
import pg from "pg";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? null);
};

const JOB = "2rhub-cron-billing-daily";
// 06:00 UTC = 07:00 à Libreville (UTC+1).
const SCHEDULE = "0 6 * * *";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DIRECT_URL ou DATABASE_URL manquante");
  process.exit(1);
}
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});
await client.connect();

try {
  if (args.includes("--list")) {
    const jobs = await client.query(
      `SELECT jobname, schedule, active FROM cron.job ORDER BY jobname`,
    );
    console.table(jobs.rows);
    const runs = await client.query(
      `SELECT j.jobname, r.status, r.start_time, r.return_message
         FROM cron.job_run_details r JOIN cron.job j ON j.jobid = r.jobid
        ORDER BY r.start_time DESC LIMIT 5`,
    );
    console.table(runs.rows);
  } else if (args.includes("--remove")) {
    await client.query(`SELECT cron.unschedule($1)`, [JOB]);
    console.log(`Tâche « ${JOB} » supprimée.`);
  } else {
    const url = flag("--url")?.replace(/\/$/, "");
    const secret = process.env.CRON_SECRET?.trim();
    if (!url || !/^https:\/\//.test(url)) {
      console.error("Indiquez l’URL publique de production : --url https://…");
      process.exit(1);
    }
    if (!secret) {
      console.error("CRON_SECRET manquant dans .env");
      process.exit(1);
    }

    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_cron`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_net`);
    await client.query(
      `SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = $1`,
      [JOB],
    );
    const command = `SELECT net.http_post(
      url := ${pg.escapeLiteral(`${url}/api/cron/billing`)},
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', ${pg.escapeLiteral(secret)}),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    )`;
    await client.query(`SELECT cron.schedule($1, $2, $3)`, [JOB, SCHEDULE, command]);
    console.log(`OK : « ${JOB} » planifiée (${SCHEDULE} UTC) → ${url}/api/cron/billing`);
  }
} catch (e) {
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
