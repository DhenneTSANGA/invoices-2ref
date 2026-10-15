-- Pipeline aligné sur le canevas du cahier des charges (§4) :
-- 1 Identification · 2 Qualification · 3 Premier contact · 4 RDV · 5 Proposition · 6 Négociation / décision
ALTER TYPE "CrmPipelineStage" ADD VALUE IF NOT EXISTS 'identification' BEFORE 'qualification';

-- Date de passage en qualification (indicateur « prospects qualifiés », objectifs mensuels)
ALTER TABLE "crm_opportunities" ADD COLUMN IF NOT EXISTS "qualifiedAt" TIMESTAMP(3);
UPDATE "crm_opportunities" SET "qualifiedAt" = "createdAt" WHERE "qualifiedAt" IS NULL;

-- Note : la table « crm_week_checks » (ancienne checklist commune) n’est plus utilisée
-- par le code ; elle sera supprimée une fois cette version déployée.
