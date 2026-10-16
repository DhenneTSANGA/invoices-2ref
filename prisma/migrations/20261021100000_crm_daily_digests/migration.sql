-- Récapitulatif quotidien Prospection : un envoi par manager, jour et cabinet.
CREATE TABLE IF NOT EXISTS "crm_daily_digests" (
    "id" TEXT NOT NULL,
    "cabinet" "Cabinet" NOT NULL DEFAULT 'conseil',
    "staffId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "items" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_daily_digests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_daily_digests_staffId_day_cabinet_key"
    ON "crm_daily_digests"("staffId", "day", "cabinet");
CREATE INDEX IF NOT EXISTS "crm_daily_digests_sentAt_idx" ON "crm_daily_digests"("sentAt");
