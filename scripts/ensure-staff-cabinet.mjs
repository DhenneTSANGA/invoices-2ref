import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const cols = await client.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'staff_members'
  ORDER BY ordinal_position
`);
console.log("cols:", cols.rows.map((r) => r.column_name).join(", "));
const hasCabinet = cols.rows.some((r) => r.column_name === "cabinet");
if (!hasCabinet) {
  console.log("Adding missing cabinet column…");
  await client.query(`
    DO $$ BEGIN
      CREATE TYPE "Cabinet" AS ENUM ('conseil', 'expertise_fiscale');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await client.query(`ALTER TABLE "staff_members" ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet"`);
  await client.query(`
    UPDATE "staff_members"
    SET "cabinet" = 'expertise_fiscale'
    WHERE "cabinet" IS NULL AND "role"::text <> 'super_admin'
  `);
  await client.query(
    `CREATE INDEX IF NOT EXISTS "staff_members_cabinet_idx" ON "staff_members"("cabinet")`,
  );
  console.log("cabinet column added.");
} else {
  console.log("cabinet column OK");
}
await client.end();
