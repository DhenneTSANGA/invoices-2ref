-- Identifiant client (facture / devis)
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "clientRef" TEXT NOT NULL DEFAULT '';
