-- Budget settings (global)
CREATE TABLE IF NOT EXISTS "crm_budget_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "monthlyBudgetPerManager" DECIMAL(18,2) NOT NULL DEFAULT 500000,
  "alertRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  "approvalThreshold" DECIMAL(18,2) NOT NULL DEFAULT 100000,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_budget_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "crm_budget_settings" ("id", "monthlyBudgetPerManager", "alertRatio", "approvalThreshold", "updatedAt")
VALUES ('default', 500000, 0.8, 100000, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Notifications par collaborateur
ALTER TABLE "crm_notifications"
  ADD COLUMN IF NOT EXISTS "staffId" TEXT;

-- Anciennes notifs globales : assignées au premier super_admin / admin, sinon conservées vides puis purgées côté app
UPDATE "crm_notifications" n
SET "staffId" = (
  SELECT s.id FROM "staff_members" s
  WHERE s.role IN ('super_admin', 'admin')
  ORDER BY CASE WHEN s.role = 'super_admin' THEN 0 ELSE 1 END, s."createdAt" ASC
  LIMIT 1
)
WHERE n."staffId" IS NULL OR n."staffId" = '';

DELETE FROM "crm_notifications" WHERE "staffId" IS NULL OR "staffId" = '';

ALTER TABLE "crm_notifications"
  ALTER COLUMN "staffId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "crm_notifications_staffId_read_at_idx"
  ON "crm_notifications"("staffId", "read", "at");

CREATE INDEX IF NOT EXISTS "crm_notifications_staffId_at_idx"
  ON "crm_notifications"("staffId", "at");
