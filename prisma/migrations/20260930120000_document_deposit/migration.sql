-- Acompte déjà versé (XAF), déduit du TTC sur les factures 2R Conseil
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "deposit" DECIMAL(18, 2) NOT NULL DEFAULT 0;
