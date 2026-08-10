-- Sections optionnelles pour factures / devis structurés
CREATE TABLE IF NOT EXISTS "document_sections" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "document_sections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_sections_documentId_idx"
  ON "document_sections"("documentId");

DO $$ BEGIN
  ALTER TABLE "document_sections"
    ADD CONSTRAINT "document_sections_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "document_lines"
  ADD COLUMN IF NOT EXISTS "sectionId" TEXT;

CREATE INDEX IF NOT EXISTS "document_lines_sectionId_idx"
  ON "document_lines"("sectionId");

DO $$ BEGIN
  ALTER TABLE "document_lines"
    ADD CONSTRAINT "document_lines_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "document_sections"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
