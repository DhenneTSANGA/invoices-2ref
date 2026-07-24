-- Fiches circuit & status attachées aux clients
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "ficheCircuitUrl" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "ficheCircuitName" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "ficheStatusUrl" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "ficheStatusName" TEXT;
