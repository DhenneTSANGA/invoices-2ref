ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

DO $$ BEGIN
  ALTER TABLE "clients"
    ADD CONSTRAINT "clients_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "staff_members"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "clients_createdById_idx" ON "clients"("createdById");
