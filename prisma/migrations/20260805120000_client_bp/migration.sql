-- Boîte postale client (courriels)
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "bp" TEXT NOT NULL DEFAULT '';
