-- Multi-cabinet + rôles super_admin + demandes admin

-- Enums
DO $$ BEGIN
  CREATE TYPE "Cabinet" AS ENUM ('conseil', 'expertise_fiscale');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdminRequestStatus" AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Étendre StaffRole
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'super_admin';

-- Company.cabinet
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet";
UPDATE "companies" SET "cabinet" = 'expertise_fiscale' WHERE "cabinet" IS NULL;
ALTER TABLE "companies" ALTER COLUMN "cabinet" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "companies" ADD CONSTRAINT "companies_cabinet_key" UNIQUE ("cabinet");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Staff.cabinet
ALTER TABLE "staff_members" ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet";
UPDATE "staff_members" SET "cabinet" = 'expertise_fiscale' WHERE "cabinet" IS NULL AND "role" <> 'super_admin';
CREATE INDEX IF NOT EXISTS "staff_members_cabinet_idx" ON "staff_members"("cabinet");

-- Clients
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet";
UPDATE "clients" SET "cabinet" = 'expertise_fiscale' WHERE "cabinet" IS NULL;
ALTER TABLE "clients" ALTER COLUMN "cabinet" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "clients_cabinet_idx" ON "clients"("cabinet");

-- Services: remplacer unique code global par (cabinet, code)
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

-- Documents
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

-- Admin requests
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

-- Seed cabinet 2R Conseil si absent
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
