-- Mention optionnelle du mois d’échéance sur les désignations (factures d’abonnement)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "showDueMonthOnLines" BOOLEAN NOT NULL DEFAULT false;
