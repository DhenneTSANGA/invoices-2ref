-- Conversion devis → facture : la facture garde le lien vers son devis d'origine
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "sourceQuotationId" TEXT;

CREATE INDEX IF NOT EXISTS "documents_sourceQuotationId_idx" ON "documents"("sourceQuotationId");
