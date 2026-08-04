/**
 * Passe un staff existant en super_admin (cabinet = null).
 * Usage :
 *   node scripts/set-super-admin.mjs --email user@example.com
 *   node scripts/set-super-admin.mjs --id <uuid>
 *   pnpm exec node scripts/set-super-admin.mjs --email user@example.com
 */
import "dotenv/config";
import pg from "pg";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  if (i === -1) return null;
  return args[i + 1] ?? null;
}

const email = flag("--email");
const id = flag("--id");

if (!email && !id) {
  console.error("Usage: node scripts/set-super-admin.mjs --email <adresse> | --id <uuid>");
  process.exit(1);
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DIRECT_URL ou DATABASE_URL manquant dans .env");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

await client.connect();

const byEmail = Boolean(email);
const param = byEmail ? email.trim() : id.trim();
const where = byEmail ? "LOWER(email) = LOWER($1)" : "id = $1";

const before = await client.query(
  `SELECT id, email, role, cabinet FROM staff_members WHERE ${where}`,
  [param],
);

if (before.rowCount === 0) {
  console.error("Aucun staff trouvé pour", param);
  await client.end();
  process.exit(1);
}

const row = before.rows[0];

if (row.role === "super_admin" && row.cabinet == null) {
  console.log(JSON.stringify({ ok: true, already: true, staff: row }));
  await client.end();
  process.exit(0);
}

const updated = await client.query(
  `UPDATE staff_members
   SET role = 'super_admin'::"StaffRole",
       cabinet = NULL,
       "updatedAt" = NOW()
   WHERE ${where}
   RETURNING id, email, role, cabinet`,
  [param],
);

console.log(
  JSON.stringify({
    ok: true,
    already: false,
    before: row,
    staff: updated.rows[0],
  }),
);

await client.end();
