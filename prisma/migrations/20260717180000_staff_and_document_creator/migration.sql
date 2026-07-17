-- Staff roles
CREATE TYPE "StaffRole" AS ENUM ('member', 'admin');

-- Collaborateurs
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "role" "StaffRole" NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_members_email_key" ON "staff_members"("email");
CREATE INDEX "staff_members_lastName_idx" ON "staff_members"("lastName");
CREATE INDEX "staff_members_role_idx" ON "staff_members"("role");

-- Retirer userId du cabinet (singleton, plus lié à un user)
DROP INDEX IF EXISTS "companies_userId_key";
DROP INDEX IF EXISTS "companies_email_idx";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "userId";

-- Lier documents au créateur
-- Tables vides en pratique : on ajoute la colonne puis la FK
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- Placeholder staff pour d'éventuelles lignes orphelines (sécurité migration)
INSERT INTO "staff_members" ("id", "email", "firstName", "lastName", "jobTitle", "role", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'system@2ref.ga', 'Système', '2REF', 'Administrateur', 'admin', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "documents" SET "createdById" = '00000000-0000-0000-0000-000000000001' WHERE "createdById" IS NULL;

ALTER TABLE "documents" ALTER COLUMN "createdById" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "documents_createdById_idx" ON "documents"("createdById");

DO $$ BEGIN
  ALTER TABLE "documents"
    ADD CONSTRAINT "documents_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "staff_members"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
