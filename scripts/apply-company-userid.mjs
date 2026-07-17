import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import pg from "pg";

const migrationName = "20260717170000_company_user_id";
const sqlPath = `prisma/migrations/${migrationName}/migration.sql`;
let sql = fs.readFileSync(sqlPath, "utf8");
if (sql.charCodeAt(0) === 0xfeff) sql = sql.slice(1);

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

await client.connect();

try {
  await client.query("BEGIN");
  await client.query(sql);
  const checksum = crypto.createHash("sha256").update(sql).digest("hex");
  const existing = await client.query(
    `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
    [migrationName],
  );
  if (existing.rowCount === 0) {
    await client.query(
      `INSERT INTO "_prisma_migrations"
        (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ($1, $2, now(), $3, NULL, NULL, now(), 1)`,
      [crypto.randomUUID(), checksum, migrationName],
    );
  }
  await client.query("COMMIT");
  console.log("Applied", migrationName);
} catch (e) {
  await client.query("ROLLBACK");
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
