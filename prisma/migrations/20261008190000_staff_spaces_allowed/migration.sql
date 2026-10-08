-- Espaces autorisés par collaborateur (facturation / prospection / both)

CREATE TYPE "StaffSpacesAllowed" AS ENUM ('facturation', 'prospection', 'both');

ALTER TABLE "staff_members"
  ADD COLUMN IF NOT EXISTS "spacesAllowed" "StaffSpacesAllowed" NOT NULL DEFAULT 'facturation';

UPDATE "staff_members"
SET "spacesAllowed" = 'both'
WHERE "role" = 'super_admin';

CREATE INDEX IF NOT EXISTS "staff_members_spacesAllowed_idx" ON "staff_members"("spacesAllowed");
