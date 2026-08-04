-- Demandes de signature des courriels (membre → admin/SA)
CREATE TABLE IF NOT EXISTS "letter_signature_requests" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "cabinet" "Cabinet" NOT NULL,
  "status" "AdminRequestStatus" NOT NULL DEFAULT 'pending',
  "requestedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "letter_signature_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "letter_signature_requests_documentId_status_idx"
  ON "letter_signature_requests"("documentId", "status");

CREATE INDEX IF NOT EXISTS "letter_signature_requests_cabinet_status_createdAt_idx"
  ON "letter_signature_requests"("cabinet", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "letter_signature_requests_requestedById_idx"
  ON "letter_signature_requests"("requestedById");

DO $$ BEGIN
  ALTER TABLE "letter_signature_requests"
    ADD CONSTRAINT "letter_signature_requests_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "letter_signature_requests"
    ADD CONSTRAINT "letter_signature_requests_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "staff_members"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "letter_signature_requests"
    ADD CONSTRAINT "letter_signature_requests_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "staff_members"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
