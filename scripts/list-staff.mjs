import "dotenv/config";
import pg from "pg";

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

await c.connect();

const tables = await c.query(`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('staff_members', 'companies', 'profiles', 'users')
  ORDER BY 1
`);
console.log(
  "Tables:",
  tables.rows.map((r) => r.tablename).join(", ") || "(aucune)",
);

const cols = await c.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'staff_members'
  ORDER BY ordinal_position
`);
console.log("staff_members cols:", cols.rows.map((r) => r.column_name).join(", "));

const staff = await c.query(`
  SELECT id, email, "firstName", "lastName", "jobTitle", phone, role, "createdAt"
  FROM staff_members
  ORDER BY "createdAt" DESC
  LIMIT 20
`);
console.log("staff count:", staff.rowCount);
for (const r of staff.rows) console.log(JSON.stringify(r));

await c.end();
