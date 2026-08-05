-- Remise globale (%) sur factures et devis
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(5, 2) NOT NULL DEFAULT 0;
