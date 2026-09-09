-- Abonnements : échéance configurable + relances de paiement
ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "subscriptionDueDay" INTEGER,
  ADD COLUMN IF NOT EXISTS "subscriptionDueMonthsOffset" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "payment_reminder_logs" (
  "id" TEXT NOT NULL,
  "cabinet" "Cabinet" NOT NULL,
  "clientId" TEXT NOT NULL,
  "reminderDay" INTEGER NOT NULL,
  "periodMonth" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "documentIds" TEXT[] NOT NULL,
  "totalAmount" DECIMAL(18,2) NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_reminder_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_reminder_logs_clientId_reminderDay_periodMonth_key"
  ON "payment_reminder_logs"("clientId", "reminderDay", "periodMonth");

CREATE INDEX IF NOT EXISTS "payment_reminder_logs_cabinet_sentAt_idx"
  ON "payment_reminder_logs"("cabinet", "sentAt");

CREATE INDEX IF NOT EXISTS "payment_reminder_logs_clientId_sentAt_idx"
  ON "payment_reminder_logs"("clientId", "sentAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_reminder_logs_clientId_fkey'
  ) THEN
    ALTER TABLE "payment_reminder_logs"
      ADD CONSTRAINT "payment_reminder_logs_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
