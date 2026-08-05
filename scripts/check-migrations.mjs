import "dotenv/config";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  const migs = await client.query(`
    SELECT migration_name, finished_at
    FROM "_prisma_migrations"
    ORDER BY finished_at DESC NULLS LAST
    LIMIT 20
  `);
  console.log("Recent migrations:");
  for (const r of migs.rows) {
    console.log(" -", r.migration_name, r.finished_at);
  }

  const enums = await client.query(`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'DocumentStatus'
    ORDER BY e.enumsortorder
  `);
  console.log("DocumentStatus:", enums.rows.map((r) => r.enumlabel).join(", "));
} finally {
  await client.end();
}
