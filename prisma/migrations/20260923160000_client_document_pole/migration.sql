-- Pôle métier (formation / audit / juridique / comptabilité)
DO $$ BEGIN
  CREATE TYPE "ClientPole" AS ENUM ('formation', 'audit', 'juridique', 'comptabilite');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "pole" "ClientPole" NOT NULL DEFAULT 'formation';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "pole" "ClientPole" NOT NULL DEFAULT 'formation';

CREATE INDEX IF NOT EXISTS "clients_pole_idx" ON "clients"("pole");
CREATE INDEX IF NOT EXISTS "clients_cabinet_pole_idx" ON "clients"("cabinet", "pole");
CREATE INDEX IF NOT EXISTS "documents_pole_idx" ON "documents"("pole");
CREATE INDEX IF NOT EXISTS "documents_cabinet_pole_idx" ON "documents"("cabinet", "pole");
