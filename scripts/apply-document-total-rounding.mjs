/**
 * Arrondi manuel du total TTC
 *   node scripts/apply-document-total-rounding.mjs
 */
import "dotenv/config";
import fs from "fs";
import pg from "pg";

const migrationName = "20260923130000_document_total_rounding";
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
      [crypto.randomUUID(), "manual-apply-document-total-rounding", migrationName],
    );
  }
  const check = await client.query(`
    SELECT column_name, column_default
    FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'totalRounding'
  `);
  console.log("OK totalRounding:", check.rows[0] ?? "(absent)");
} catch (e) {
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
