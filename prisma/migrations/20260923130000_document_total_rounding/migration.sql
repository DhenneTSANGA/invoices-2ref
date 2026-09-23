-- Arrondi manuel du TTC (XAF signé, ex. -1 → 175 001 devient 175 000)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "totalRounding" INTEGER NOT NULL DEFAULT 0;
