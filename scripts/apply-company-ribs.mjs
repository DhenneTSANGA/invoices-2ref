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
  await client.query(
    `UPDATE companies
     SET "bankName" = $1, "bankAccount" = $2, "updatedAt" = NOW()
     WHERE cabinet = 'expertise_fiscale'`,
    ["Orabank Gabon", "40021 01002 25911900201 45"],
  );
  await client.query(
    `UPDATE companies
     SET "bankName" = $1, "bankAccount" = $2, "updatedAt" = NOW()
     WHERE cabinet = 'conseil'`,
    ["Orabank Gabon", "40003 04130 41051542011 61"],
  );
  const r = await client.query(
    `SELECT cabinet, "bankName", "bankAccount" FROM companies ORDER BY cabinet`,
  );
  console.log(r.rows);
} finally {
  await client.end();
}
