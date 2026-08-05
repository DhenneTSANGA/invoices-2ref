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
});

await client.connect();
try {
  const t = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'letter_signature_requests'
     ) AS ok`,
  );
  console.log("letter_signature_requests existe:", t.rows[0].ok);

  if (t.rows[0].ok) {
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'letter_signature_requests'
       ORDER BY ordinal_position`,
    );
    console.log(
      "colonnes:",
      cols.rows.map((r) => r.column_name).join(", "),
    );
  }

  // Indice sur quelle DB (sans secrets)
  const u = new URL(connectionString.replace(/^postgresql:/, "http:"));
  console.log("host:", u.hostname, "port:", u.port || "(défaut)");
} finally {
  await client.end();
}
