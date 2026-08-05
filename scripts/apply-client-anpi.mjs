/**
 * Applique les colonnes ANPI sur clients
 *   pnpm exec node scripts/apply-client-anpi.mjs
 */
import "dotenv/config";
import fs from "fs";
import pg from "pg";

const migrationName = "20260805140000_client_anpi_fields";
const migrationPath = `prisma/migrations/${migrationName}/migration.sql`;
let sql = fs.readFileSync(migrationPath, "utf8");
if (sql.charCodeAt(0) === 0xfeff) sql = sql.slice(1);

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
  await client.query(sql);
  const existing = await client.query(
    `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 LIMIT 1`,
    [migrationName],
  );
  if (existing.rowCount === 0) {
    await client.query(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
      [crypto.randomUUID(), "manual-apply-client-anpi", migrationName],
    );
  }
  const check = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'clients'
      AND column_name IN (
        'sigle', 'shareCapital', 'cnss', 'cnamgs', 'activity',
        'activityDetail', 'representativeTitle', 'anpiNumber', 'anpiDate'
      )
    ORDER BY column_name
  `);
  console.log(
    "colonnes ANPI:",
    check.rows.map((r) => r.column_name).join(", ") || "MISSING",
  );
} finally {
  await client.end();
}
