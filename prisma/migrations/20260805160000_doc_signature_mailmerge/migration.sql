-- Publipostage : statut pending_signature + demande de signature
ALTER TYPE "MailMergeStatus" ADD VALUE IF NOT EXISTS 'pending_signature';

ALTER TABLE "mail_merge_campaigns" ADD COLUMN IF NOT EXISTS "signatureRequestedAt" TIMESTAMP(3);
ALTER TABLE "mail_merge_campaigns" ADD COLUMN IF NOT EXISTS "signatureRequestedById" TEXT;
ALTER TABLE "mail_merge_campaigns" ADD COLUMN IF NOT EXISTS "signatureRejectedAt" TIMESTAMP(3);
ALTER TABLE "mail_merge_campaigns" ADD COLUMN IF NOT EXISTS "signatureRejectNote" TEXT;

DO $$ BEGIN
  ALTER TABLE "mail_merge_campaigns"
    ADD CONSTRAINT "mail_merge_campaigns_signatureRequestedById_fkey"
    FOREIGN KEY ("signatureRequestedById") REFERENCES "staff_members"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Clients ponctuels (destinataires publipostage sans fiche)
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "isTransient" BOOLEAN NOT NULL DEFAULT false;
