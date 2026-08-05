import "dotenv/config";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  const cols = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'documents'
    ORDER BY ordinal_position
  `);
  console.log("documents columns:");
  for (const r of cols.rows) console.log(" -", r.column_name, r.data_type);

  const required = ["discount"];
  for (const col of required) {
    const ok = cols.rows.some((r) => r.column_name === col);
    console.log(`has ${col}:`, ok);
  }

  const sig = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name ILIKE '%signature%'
  `);
  console.log("signature tables:", sig.rows.map((r) => r.table_name).join(", ") || "(none)");
} finally {
  await client.end();
}
