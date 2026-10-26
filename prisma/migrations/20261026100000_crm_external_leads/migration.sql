-- Prospection : pistes externes (recommandation d'un tiers hors de l'entreprise visée).
ALTER TYPE "CrmOpportunitySource" ADD VALUE IF NOT EXISTS 'piste_externe';

ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "origin" TEXT NOT NULL DEFAULT 'interne';
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "referrerName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "referrerContact" TEXT NOT NULL DEFAULT '';
ALTER TABLE "crm_leads" ADD COLUMN IF NOT EXISTS "referrerRelation" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "crm_leads_origin_idx" ON "crm_leads"("origin");
