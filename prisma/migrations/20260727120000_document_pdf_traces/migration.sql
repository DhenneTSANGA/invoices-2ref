-- Document PDF traces (download / email)

DO $$ BEGIN
  CREATE TYPE "DocumentPdfAction" AS ENUM ('download', 'email');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "document_pdf_traces" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "cabinet" "Cabinet" NOT NULL,
  "action" "DocumentPdfAction" NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_pdf_traces_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_pdf_traces_documentId_createdAt_idx"
  ON "document_pdf_traces"("documentId", "createdAt");
CREATE INDEX IF NOT EXISTS "document_pdf_traces_cabinet_createdAt_idx"
  ON "document_pdf_traces"("cabinet", "createdAt");
CREATE INDEX IF NOT EXISTS "document_pdf_traces_staffId_idx"
  ON "document_pdf_traces"("staffId");

DO $$ BEGIN
  ALTER TABLE "document_pdf_traces"
    ADD CONSTRAINT "document_pdf_traces_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "document_pdf_traces"
    ADD CONSTRAINT "document_pdf_traces_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "staff_members"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
