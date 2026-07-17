import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import pg from "pg";

const migrationName = "20260717180000_staff_and_document_creator";
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

  // Seed cabinet 2REF Expertise Fiscale (singleton)
  const existing = await client.query(`SELECT id FROM companies LIMIT 1`);
  if (existing.rowCount === 0) {
    await client.query(
      `INSERT INTO companies (
        id, name, tagline, nif, niu, rccm, cnss, address, city, phone, email, website, "bankName", "bankAccount", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP
      )`,
      [
        crypto.randomUUID().replace(/-/g, "").slice(0, 25),
        "2REF Expertise Fiscale",
        "Cabinet d'expertise comptable et fiscale — Gabon & CEMAC",
        "À compléter",
        "À compléter",
        "À compléter",
        null,
        "Libreville",
        "Libreville, Gabon",
        "+241 00 00 00 00",
        "contact@2ref.ga",
        null,
        null,
        null,
      ],
    );
    console.log("Seeded company: 2REF Expertise Fiscale");
  } else {
    await client.query(
      `UPDATE companies SET name = $1, tagline = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3`,
      [
        "2REF Expertise Fiscale",
        "Cabinet d'expertise comptable et fiscale — Gabon & CEMAC",
        existing.rows[0].id,
      ],
    );
    console.log("Updated company name to 2REF Expertise Fiscale");
  }

  const checksum = crypto.createHash("sha256").update(sql).digest("hex");
  const mig = await client.query(
    `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
    [migrationName],
  );
  if (mig.rowCount === 0) {
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
