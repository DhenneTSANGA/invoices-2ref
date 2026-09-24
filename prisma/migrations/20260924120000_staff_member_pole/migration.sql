-- Pôle métier du collaborateur (visibilité membre uniquement)
ALTER TABLE "staff_members" ADD COLUMN IF NOT EXISTS "pole" "ClientPole";

UPDATE "staff_members"
SET "pole" = 'formation'::"ClientPole"
WHERE "pole" IS NULL AND "role" <> 'super_admin';

CREATE INDEX IF NOT EXISTS "staff_members_pole_idx" ON "staff_members"("pole");
CREATE INDEX IF NOT EXISTS "staff_members_cabinet_pole_idx" ON "staff_members"("cabinet", "pole");
