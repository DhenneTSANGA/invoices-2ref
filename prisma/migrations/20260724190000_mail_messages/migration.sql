-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "MailDirection" AS ENUM ('outbound', 'inbound');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "mail_messages" (
  "id" TEXT NOT NULL,
  "cabinet" "Cabinet",
  "direction" "MailDirection" NOT NULL,
  "resendId" TEXT,
  "fromEmail" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "preview" TEXT NOT NULL DEFAULT '',
  "htmlBody" TEXT,
  "textBody" TEXT,
  "documentId" TEXT,
  "clientId" TEXT,
  "staffId" TEXT,
  "lastEvent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mail_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "mail_messages_resendId_key" ON "mail_messages"("resendId");
CREATE INDEX IF NOT EXISTS "mail_messages_cabinet_direction_createdAt_idx"
  ON "mail_messages"("cabinet", "direction", "createdAt");
CREATE INDEX IF NOT EXISTS "mail_messages_direction_createdAt_idx"
  ON "mail_messages"("direction", "createdAt");
