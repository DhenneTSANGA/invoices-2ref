import "dotenv/config";
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";

const name = "20260722140000_multi_cabinet_roles";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

async function run(label, sql) {
  console.log(">", label);
  await client.query(sql);
}

try {
  const existing = await client.query(
    `SELECT 1 FROM _prisma_migrations WHERE migration_name = $1`,
    [name],
  );
  if ((existing.rowCount ?? 0) > 0) {
    console.log("Already applied", name);
    process.exit(0);
  }

  // 1) Enum values must be committed alone before use
  await run(
    "create Cabinet enum",
    `DO $$ BEGIN
      CREATE TYPE "Cabinet" AS ENUM ('conseil', 'expertise_fiscale');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`,
  );
  await run(
    "create AdminRequestStatus enum",
    `DO $$ BEGIN
      CREATE TYPE "AdminRequestStatus" AS ENUM ('pending', 'accepted', 'rejected');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`,
  );
  await run(
    "add super_admin to StaffRole",
    `DO $$ BEGIN
      ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'super_admin';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`,
  );

  // Commit enum additions by ending connection transaction implicitly — force new connection for rest
  await client.end();
} catch (e) {
  console.error(e);
  await client.end();
  process.exit(1);
}

const client2 = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client2.connect();

try {
  const sql = readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
  // Skip enum creation lines already applied — run column/table changes only
  const rest = `
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet";
UPDATE "companies" SET "cabinet" = 'expertise_fiscale' WHERE "cabinet" IS NULL;
ALTER TABLE "companies" ALTER COLUMN "cabinet" SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE "companies" ADD CONSTRAINT "companies_cabinet_key" UNIQUE ("cabinet");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "staff_members" ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet";
UPDATE "staff_members" SET "cabinet" = 'expertise_fiscale' WHERE "cabinet" IS NULL AND "role"::text <> 'super_admin';
CREATE INDEX IF NOT EXISTS "staff_members_cabinet_idx" ON "staff_members"("cabinet");

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet";
UPDATE "clients" SET "cabinet" = 'expertise_fiscale' WHERE "cabinet" IS NULL;
ALTER TABLE "clients" ALTER COLUMN "cabinet" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "clients_cabinet_idx" ON "clients"("cabinet");

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet";
UPDATE "services" SET "cabinet" = 'expertise_fiscale' WHERE "cabinet" IS NULL;
ALTER TABLE "services" ALTER COLUMN "cabinet" SET NOT NULL;
ALTER TABLE "services" DROP CONSTRAINT IF EXISTS "services_code_key";
DROP INDEX IF EXISTS "services_code_key";
DO $$ BEGIN
  ALTER TABLE "services" ADD CONSTRAINT "services_cabinet_code_key" UNIQUE ("cabinet", "code");
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "services_cabinet_idx" ON "services"("cabinet");

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet";
UPDATE "documents" SET "cabinet" = 'expertise_fiscale' WHERE "cabinet" IS NULL;
ALTER TABLE "documents" ALTER COLUMN "cabinet" SET NOT NULL;
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_type_number_key";
DROP INDEX IF EXISTS "documents_type_number_key";
DO $$ BEGIN
  ALTER TABLE "documents" ADD CONSTRAINT "documents_cabinet_type_number_key" UNIQUE ("cabinet", "type", "number");
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "documents_cabinet_idx" ON "documents"("cabinet");

CREATE TABLE IF NOT EXISTS "admin_requests" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "status" "AdminRequestStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  CONSTRAINT "admin_requests_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "admin_requests"
    ADD CONSTRAINT "admin_requests_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "admin_requests"
    ADD CONSTRAINT "admin_requests_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "admin_requests_staffId_status_idx" ON "admin_requests"("staffId", "status");
CREATE INDEX IF NOT EXISTS "admin_requests_status_createdAt_idx" ON "admin_requests"("status", "createdAt");

INSERT INTO "companies" (
  "id", "cabinet", "name", "tagline", "nif", "niu", "rccm", "cnss",
  "address", "city", "phone", "email", "website", "bankName", "bankAccount",
  "createdAt", "updatedAt"
)
SELECT
  'seed_cabinet_conseil',
  'conseil',
  '2R CONSEIL',
  'Cabinet de conseil',
  '—',
  '—',
  '—',
  '',
  'Libreville',
  'Libreville, Gabon',
  '',
  'conseil@2ref.ga',
  'www.2ref.ga',
  '',
  '',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "companies" WHERE "cabinet" = 'conseil');
`;

  console.log("> apply schema changes");
  await client2.query(rest);

  const checksum = createHash("sha256").update(sql).digest("hex");
  await client2.query(
    `INSERT INTO _prisma_migrations
      (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
     VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
    [randomUUID(), checksum, name],
  );
  console.log("Applied", name);
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await client2.end();
}
