-- Espace Prospection cloisonné par cabinet, comme la Facturation.
-- Toutes les données existantes sont rattachées à 2R Conseil (défaut).

ALTER TABLE "crm_companies"      ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet" NOT NULL DEFAULT 'conseil';
ALTER TABLE "crm_opportunities"  ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet" NOT NULL DEFAULT 'conseil';
ALTER TABLE "crm_activities"     ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet" NOT NULL DEFAULT 'conseil';
ALTER TABLE "crm_leads"          ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet" NOT NULL DEFAULT 'conseil';
ALTER TABLE "crm_expenses"       ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet" NOT NULL DEFAULT 'conseil';
ALTER TABLE "crm_objectives"     ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet" NOT NULL DEFAULT 'conseil';
ALTER TABLE "crm_library_items"  ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet" NOT NULL DEFAULT 'conseil';
ALTER TABLE "crm_referentials"   ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet" NOT NULL DEFAULT 'conseil';
ALTER TABLE "crm_notifications"  ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet" NOT NULL DEFAULT 'conseil';
ALTER TABLE "crm_weekly_reports" ADD COLUMN IF NOT EXISTS "cabinet" "Cabinet" NOT NULL DEFAULT 'conseil';

CREATE INDEX IF NOT EXISTS "crm_companies_cabinet_idx"     ON "crm_companies"("cabinet");
CREATE INDEX IF NOT EXISTS "crm_opportunities_cabinet_idx" ON "crm_opportunities"("cabinet");
CREATE INDEX IF NOT EXISTS "crm_activities_cabinet_idx"    ON "crm_activities"("cabinet");
CREATE INDEX IF NOT EXISTS "crm_leads_cabinet_idx"         ON "crm_leads"("cabinet");
CREATE INDEX IF NOT EXISTS "crm_expenses_cabinet_idx"      ON "crm_expenses"("cabinet");
CREATE INDEX IF NOT EXISTS "crm_library_items_cabinet_idx" ON "crm_library_items"("cabinet");
CREATE INDEX IF NOT EXISTS "crm_referentials_cabinet_idx"  ON "crm_referentials"("cabinet");
CREATE INDEX IF NOT EXISTS "crm_notifications_staffId_cabinet_at_idx" ON "crm_notifications"("staffId", "cabinet", "at");

-- Objectifs : un jeu par manager, mois ET cabinet (un super admin manager en a un par cabinet).
DROP INDEX IF EXISTS "crm_objectives_managerId_metric_month_key";
CREATE UNIQUE INDEX IF NOT EXISTS "crm_objectives_managerId_metric_month_cabinet_key"
  ON "crm_objectives"("managerId", "metric", "month", "cabinet");

-- Rapport du lundi : un par semaine ET par cabinet.
DROP INDEX IF EXISTS "crm_weekly_reports_weekKey_key";
CREATE UNIQUE INDEX IF NOT EXISTS "crm_weekly_reports_weekKey_cabinet_key"
  ON "crm_weekly_reports"("weekKey", "cabinet");

-- Budget : un réglage par cabinet (id = cabinet), initialisé depuis le réglage commun.
INSERT INTO "crm_budget_settings" ("id", "monthlyBudgetPerManager", "alertRatio", "approvalThreshold", "updatedAt")
SELECT c.cab, COALESCE(d."monthlyBudgetPerManager", 500000), COALESCE(d."alertRatio", 0.8), COALESCE(d."approvalThreshold", 100000), now()
FROM (VALUES ('conseil'), ('expertise_fiscale')) AS c(cab)
LEFT JOIN "crm_budget_settings" d ON d."id" = 'default'
ON CONFLICT ("id") DO NOTHING;
