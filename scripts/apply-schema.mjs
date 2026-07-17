import "dotenv/config";
import fs from "fs";
import pg from "pg";

const migrationPath = "prisma/migrations/20260717160000_init/migration.sql";
let sql = fs.readFileSync(migrationPath, "utf8");
if (sql.charCodeAt(0) === 0xfeff) sql = sql.slice(1);

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

await client.connect();
console.log(
  "Connected as",
  (await client.query("select current_user")).rows[0].current_user,
);

try {
  await client.query("BEGIN");
  await client.query(sql);
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id                      VARCHAR(36)  PRIMARY KEY,
      checksum                VARCHAR(64)  NOT NULL,
      finished_at             TIMESTAMPTZ,
      migration_name          VARCHAR(255) NOT NULL,
      logs                    TEXT,
      rolled_back_at          TIMESTAMPTZ,
      started_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
      applied_steps_count     INTEGER      NOT NULL DEFAULT 0
    );
  `);
  await client.query("COMMIT");
  console.log("Schema applied successfully");

  const tables = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  console.log("Tables:", tables.rows.map((r) => r.tablename).join(", "));

  const enums = await client.query(`
    SELECT typname FROM pg_type
    WHERE typtype = 'e'
    ORDER BY typname
  `);
  console.log("Enums:", enums.rows.map((r) => r.typname).join(", "));
} catch (e) {
  await client.query("ROLLBACK");
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
