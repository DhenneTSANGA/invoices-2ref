-- Adresses d'envoi Resend par cabinet
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "mailFromEmail" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "mailReplyTo" TEXT;

UPDATE "companies"
SET "mailFromEmail" = "email"
WHERE "mailFromEmail" IS NULL OR trim("mailFromEmail") = '';

UPDATE "companies"
SET "mailReplyTo" = COALESCE(NULLIF(trim("mailFromEmail"), ''), "email")
WHERE "mailReplyTo" IS NULL OR trim("mailReplyTo") = '';
