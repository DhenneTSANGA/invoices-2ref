-- Alignement espace Prospection sur le cahier des charges (NewCDC)

-- §3 Profils CRM : direction / manager / chef de service / administrateur + lignes couvertes
ALTER TABLE "staff_members" ADD COLUMN IF NOT EXISTS "crmProfile" TEXT;
ALTER TABLE "staff_members" ADD COLUMN IF NOT EXISTS "crmLines" "CrmServiceLine"[] NOT NULL DEFAULT ARRAY[]::"CrmServiceLine"[];

-- §5 Remontée de pistes ouverte à tous : auteur réel de la piste
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
CREATE INDEX IF NOT EXISTS "crm_leads_authorId_idx" ON "crm_leads"("authorId");

-- Dates de passage en proposition / signature (réalisé mensuel, rapport hebdo)
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "proposalAt" TIMESTAMP(3);
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "wonAt" TIMESTAMP(3);
UPDATE "crm_opportunities"
SET "proposalAt" = COALESCE("stageChangedAt", "updatedAt")
WHERE "proposalAt" IS NULL AND "stage" IN ('proposition', 'negotiation', 'decision', 'gagne');
UPDATE "crm_opportunities"
SET "wonAt" = COALESCE("stageChangedAt", "updatedAt")
WHERE "wonAt" IS NULL AND "stage" = 'gagne';

-- Objectifs mensuels par manager (AAAA-MM)
ALTER TABLE "crm_objectives" ADD COLUMN IF NOT EXISTS "month" TEXT;
UPDATE "crm_objectives"
SET "month" = to_char(now() AT TIME ZONE 'Africa/Libreville', 'YYYY-MM')
WHERE "month" IS NULL;
ALTER TABLE "crm_objectives" ALTER COLUMN "month" SET DEFAULT to_char(now() AT TIME ZONE 'Africa/Libreville', 'YYYY-MM');
ALTER TABLE "crm_objectives" ALTER COLUMN "month" SET NOT NULL;
DROP INDEX IF EXISTS "crm_objectives_managerId_metric_key";
CREATE UNIQUE INDEX IF NOT EXISTS "crm_objectives_managerId_metric_month_key"
  ON "crm_objectives"("managerId", "metric", "month");
CREATE INDEX IF NOT EXISTS "crm_objectives_month_idx" ON "crm_objectives"("month");

-- Justificatif photo des dépenses (Storage privé « crm-receipts »)
ALTER TABLE "crm_expenses" ADD COLUMN IF NOT EXISTS "receiptPath" TEXT;
ALTER TABLE "crm_expenses" ADD COLUMN IF NOT EXISTS "receiptName" TEXT;

-- Rapport de synthèse hebdomadaire envoyé à la direction (un par semaine)
CREATE TABLE IF NOT EXISTS "crm_weekly_reports" (
  "id" TEXT NOT NULL,
  "weekKey" TEXT NOT NULL,
  "recipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_weekly_reports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "crm_weekly_reports_weekKey_key" ON "crm_weekly_reports"("weekKey");
