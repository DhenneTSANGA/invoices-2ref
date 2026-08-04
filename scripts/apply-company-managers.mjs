/**
 * Renseigne les noms des gérants par cabinet (si absents en base).
 *   pnpm exec node scripts/apply-company-managers.mjs
 */
import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DIRECT_URL ou DATABASE_URL manquante");
  process.exit(1);
}

const managers = [
  { cabinet: "conseil", name: "M. Romaric BOULINGUI" },
  { cabinet: "expertise_fiscale", name: "M. Richard BICKAPA NIONGUI" },
];

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

await client.connect();
try {
  for (const m of managers) {
    await client.query(
      `UPDATE companies
       SET "managerName" = $1, "updatedAt" = NOW()
       WHERE cabinet = $2
         AND ("managerName" IS NULL OR TRIM("managerName") = '')`,
      [m.name, m.cabinet],
    );
  }
  const r = await client.query(
    `SELECT cabinet, "managerName" FROM companies ORDER BY cabinet`,
  );
  console.log(r.rows);
} finally {
  await client.end();
}
