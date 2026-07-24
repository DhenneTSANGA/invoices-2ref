import "dotenv/config";
import fs from "fs";
import pg from "pg";

const migrationPath =
  "prisma/migrations/20260724170000_document_payment_method/migration.sql";
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
  console.log("Colonne paymentMethod appliquée.");
} catch (e) {
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
