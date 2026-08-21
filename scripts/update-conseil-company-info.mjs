/**
 * Met à jour les infos émetteur 2R Conseil (NIF, téléphone, banque, retire STAT).
 *   pnpm exec node scripts/update-conseil-company-info.mjs
 */
import "dotenv/config";
import pg from "pg";

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
  const result = await client.query(
    `UPDATE companies
     SET
       nif = $1,
       niu = $2,
       phone = $3,
       "bankName" = $4,
       website = NULL,
       "updatedAt" = NOW()
     WHERE cabinet = 'conseil'::"Cabinet"
     RETURNING name, nif, niu, phone, "bankName", website`,
    ["748151k", "—", "074 02 55 52 / 011 44 39 64", "BGFI BANK"],
  );
  if (result.rowCount === 0) {
    console.log("Aucune fiche company conseil en base — les defaults code s’appliqueront.");
  } else {
    console.log("OK — 2R Conseil mis à jour :", result.rows[0]);
  }
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}
