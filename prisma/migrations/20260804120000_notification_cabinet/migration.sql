-- Séparation des notifications par cabinet (vue super admin = cabinet actif)
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet";

UPDATE "notifications" n
SET "cabinet" = d."cabinet"
FROM "documents" d
WHERE n."documentId" = d."id" AND n."cabinet" IS NULL;

CREATE INDEX IF NOT EXISTS "notifications_staffId_cabinet_at_idx"
  ON "notifications"("staffId", "cabinet", "at");
