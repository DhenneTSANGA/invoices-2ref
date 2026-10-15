DO $$ BEGIN
  ALTER TYPE "DocumentPdfAction" ADD VALUE 'edit';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "document_pdf_traces"
  ALTER COLUMN "fileName" DROP NOT NULL;

ALTER TABLE "document_pdf_traces"
  ALTER COLUMN "fileUrl" DROP NOT NULL;
