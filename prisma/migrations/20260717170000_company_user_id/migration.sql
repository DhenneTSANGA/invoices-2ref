-- AlterTable
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "companies_userId_key" ON "companies"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "companies_email_idx" ON "companies"("email");
