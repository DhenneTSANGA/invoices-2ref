-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ClientBillingProfile" AS ENUM ('subscription', 'one_off', 'mixed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "billingProfile" "ClientBillingProfile" NOT NULL DEFAULT 'mixed';

CREATE INDEX IF NOT EXISTS "clients_billingProfile_idx" ON "clients"("billingProfile");
