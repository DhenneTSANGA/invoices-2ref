ALTER TABLE "crm_opportunities"
  ADD COLUMN IF NOT EXISTS "stageChangedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "crm_reminder_logs" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "dueDate" DATE NOT NULL,
  "stage" "CrmPipelineStage" NOT NULL,
  "staffId" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_reminder_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_reminder_logs_opportunityId_fkey" FOREIGN KEY ("opportunityId")
    REFERENCES "crm_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_reminder_logs_opportunityId_kind_dueDate_key"
  ON "crm_reminder_logs"("opportunityId", "kind", "dueDate");

CREATE INDEX IF NOT EXISTS "crm_reminder_logs_sentAt_idx"
  ON "crm_reminder_logs"("sentAt");
