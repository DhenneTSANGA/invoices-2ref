-- Remove pro forma documents and drop related columns / enum value.

DELETE FROM "document_lines"
WHERE "documentId" IN (SELECT "id" FROM "documents" WHERE "type" = 'proforma');

DELETE FROM "documents" WHERE "type" = 'proforma';

ALTER TABLE "documents" DROP COLUMN IF EXISTS "incoterm";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "shippingNotes";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "disclaimer";

ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
CREATE TYPE "DocumentType" AS ENUM ('quotation', 'invoice', 'letter');
ALTER TABLE "documents"
  ALTER COLUMN "type" TYPE "DocumentType"
  USING ("type"::text::"DocumentType");
DROP TYPE "DocumentType_old";
