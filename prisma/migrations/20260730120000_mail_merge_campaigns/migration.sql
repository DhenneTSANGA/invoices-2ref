-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'signed';

-- AlterTable Company
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "managerName" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "stampUrl" TEXT;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "MailMergeStatus" AS ENUM ('draft', 'signed', 'sent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "mail_merge_campaigns" (
    "id" TEXT NOT NULL,
    "cabinet" "Cabinet" NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "MailMergeStatus" NOT NULL DEFAULT 'draft',
    "subject" TEXT NOT NULL,
    "salutation" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "closing" TEXT NOT NULL DEFAULT '',
    "signatoryTitle" TEXT NOT NULL DEFAULT 'Le Gérant',
    "issueDate" DATE NOT NULL,
    "signedAt" TIMESTAMP(3),
    "signedById" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_merge_campaigns_pkey" PRIMARY KEY ("id")
);

-- AlterTable Document
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "mailMergeCampaignId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mail_merge_campaigns_cabinet_createdAt_idx" ON "mail_merge_campaigns"("cabinet", "createdAt");
CREATE INDEX IF NOT EXISTS "mail_merge_campaigns_status_idx" ON "mail_merge_campaigns"("status");
CREATE INDEX IF NOT EXISTS "mail_merge_campaigns_createdById_idx" ON "mail_merge_campaigns"("createdById");
CREATE INDEX IF NOT EXISTS "documents_mailMergeCampaignId_idx" ON "documents"("mailMergeCampaignId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "mail_merge_campaigns" ADD CONSTRAINT "mail_merge_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "mail_merge_campaigns" ADD CONSTRAINT "mail_merge_campaigns_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "documents" ADD CONSTRAINT "documents_mailMergeCampaignId_fkey" FOREIGN KEY ("mailMergeCampaignId") REFERENCES "mail_merge_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
