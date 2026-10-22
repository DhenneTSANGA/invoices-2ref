/**
 * Migration Facturation : manager Prospection apporteur et date d’encaissement
 *   node scripts/apply-invoice-prospection-manager.mjs
 */
import "dotenv/config";
import fs from "fs";
import pg from "pg";

const migrationName = "20261022100000_invoice_prospection_manager";
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
      [crypto.randomUUID(), "manual-apply-invoice-prospection-manager", migrationName],
    );
  }
  const check = await client.query(`
    SELECT count(*) FILTER (WHERE "paidAt" IS NOT NULL)::int AS payees_datees,
           count(*) FILTER (WHERE "prospectionManagerId" IS NOT NULL)::int AS rattachees
    FROM "documents" WHERE "type" = 'invoice'
  `);
  console.log("factures :", check.rows[0]);
} catch (e) {
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
