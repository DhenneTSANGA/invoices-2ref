-- Legacy notifications were global; reset before per-staff targeting.
TRUNCATE TABLE "notifications";

ALTER TABLE "notifications" ADD COLUMN "staffId" TEXT NOT NULL;
ALTER TABLE "notifications" ADD COLUMN "documentId" TEXT;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "notifications_staffId_read_idx" ON "notifications"("staffId", "read");
CREATE INDEX "notifications_staffId_at_idx" ON "notifications"("staffId", "at");

DROP INDEX IF EXISTS "notifications_read_idx";
DROP INDEX IF EXISTS "notifications_at_idx";
