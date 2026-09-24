/**
 * Rétrograde un super_admin vers admin (ou membre) et rattache un cabinet.
 * Sans cabinet, le compte ne peut plus se connecter à l’app.
 *
 * Usage :
 *   node scripts/unset-super-admin.mjs --email user@example.com --cabinet conseil
 *   node scripts/unset-super-admin.mjs --email user@example.com --cabinet expertise_fiscale --role member
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
const cabinet = flag("--cabinet");
const role = (flag("--role") ?? "admin").trim();

if (!email && !id) {
  console.error(
    "Usage: node scripts/unset-super-admin.mjs --email <adresse> --cabinet conseil|expertise_fiscale [--role admin|member]",
  );
  process.exit(1);
}

if (cabinet !== "conseil" && cabinet !== "expertise_fiscale") {
  console.error("Cabinet requis : --cabinet conseil  OU  --cabinet expertise_fiscale");
  process.exit(1);
}

if (role !== "admin" && role !== "member") {
  console.error("Rôle invalide : --role admin  OU  --role member");
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

const updated = await client.query(
  `UPDATE staff_members
   SET role = $2::"StaffRole",
       cabinet = $3::"Cabinet",
       "updatedAt" = NOW()
   WHERE ${where}
   RETURNING id, email, role, cabinet`,
  [param, role, cabinet],
);

console.log(
  JSON.stringify({
    ok: true,
    before: row,
    staff: updated.rows[0],
  }),
);

await client.end();
