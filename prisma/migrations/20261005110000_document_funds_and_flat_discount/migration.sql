-- Fonds de procédures (hors taxe) et remise forfaitaire, factures / devis 2R Conseil
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "discountMode" TEXT NOT NULL DEFAULT 'percent';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "discountFixed" DECIMAL(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE "document_lines" ADD COLUMN IF NOT EXISTS "billingKind" TEXT NOT NULL DEFAULT 'service';
