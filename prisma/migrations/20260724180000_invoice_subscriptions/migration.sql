-- AlterTable documents : factures d'abonnement
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "isSubscription" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "subscriptionActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "subscriptionDay" INTEGER;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "subscriptionNextAt" DATE;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "subscriptionOfId" TEXT;

DO $$ BEGIN
  ALTER TABLE "documents"
    ADD CONSTRAINT "documents_subscriptionOfId_fkey"
    FOREIGN KEY ("subscriptionOfId") REFERENCES "documents"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "documents_isSubscription_subscriptionActive_subscriptionNextAt_idx"
  ON "documents"("isSubscription", "subscriptionActive", "subscriptionNextAt");
CREATE INDEX IF NOT EXISTS "documents_subscriptionOfId_idx"
  ON "documents"("subscriptionOfId");
