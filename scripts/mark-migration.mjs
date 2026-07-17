import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import pg from "pg";

const migrationName = "20260717160000_init";
const sql = fs.readFileSync(
  `prisma/migrations/${migrationName}/migration.sql`,
  "utf8",
);
const checksum = crypto.createHash("sha256").update(sql).digest("hex");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

await client.connect();

const existing = await client.query(
  `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
  [migrationName],
);

if (existing.rowCount > 0) {
  console.log("Migration already recorded:", migrationName);
} else {
  await client.query(
    `INSERT INTO "_prisma_migrations"
      (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
     VALUES ($1, $2, now(), $3, NULL, NULL, now(), 1)`,
    [crypto.randomUUID(), checksum, migrationName],
  );
  console.log("Recorded migration:", migrationName, "checksum", checksum.slice(0, 12));
}

await client.end();
