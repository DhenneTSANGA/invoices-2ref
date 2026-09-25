/**
 * Recopie le pôle du client sur toutes ses factures / devis / lettres.
 *   node scripts/apply-sync-document-poles-from-clients.mjs
 */
import "dotenv/config";
import fs from "fs";
import pg from "pg";

const migrationName = "20260925120000_sync_document_pole_from_client";
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
  const before = await client.query(`
    SELECT count(*)::int AS n
    FROM "documents" d
    JOIN "clients" c ON c.id = d."clientId"
    WHERE d.pole IS DISTINCT FROM c.pole
  `);
  await client.query(sql);
  const existing = await client.query(
    `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 LIMIT 1`,
    [migrationName],
  );
  if (existing.rowCount === 0) {
    await client.query(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
      [
        crypto.randomUUID(),
        "manual-apply-sync-document-poles-from-clients",
        migrationName,
      ],
    );
  }
  const after = await client.query(`
    SELECT count(*)::int AS n
    FROM "documents" d
    JOIN "clients" c ON c.id = d."clientId"
    WHERE d.pole IS DISTINCT FROM c.pole
  `);
  const sample = await client.query(`
    SELECT c.name, c.pole::text AS client_pole, count(*)::int AS docs
    FROM "documents" d
    JOIN "clients" c ON c.id = d."clientId"
    GROUP BY c.name, c.pole
    ORDER BY docs DESC
    LIMIT 8
  `);
  console.log(
    `OK sync pôles documents : ${before.rows[0].n} mis à jour, ${after.rows[0].n} encore décalés`,
  );
  for (const row of sample.rows) {
    console.log(`  - ${row.name} · ${row.client_pole} · ${row.docs} doc(s)`);
  }
} catch (e) {
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
