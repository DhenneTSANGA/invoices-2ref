import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL / DATABASE_URL manquant");
  process.exit(1);
}

const migrationName = "20261008220000_crm_budget_notifs_staff";
const sqlPath = resolve("prisma/migrations", migrationName, "migration.sql");
const sql = readFileSync(sqlPath, "utf8");

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  const existing = await client.query(
    `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 LIMIT 1`,
    [migrationName],
  );
  if (existing.rowCount > 0) {
    console.log("Migration déjà appliquée:", migrationName);
    process.exit(0);
  }

  console.log("Application", migrationName, "…");
  await client.query("BEGIN");
  await client.query(sql);
  await client.query(
    `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
     VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
    [randomUUID(), "manual-apply-crm-budget-notifs", migrationName],
  );
  await client.query("COMMIT");
  console.log("OK — budget settings + notifications staffId");
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}
