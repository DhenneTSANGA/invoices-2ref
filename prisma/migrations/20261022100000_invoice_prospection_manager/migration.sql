-- Facture : manager Prospection apporteur (encaissé par manager) et date d'encaissement.
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "prospectionManagerId" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_prospectionManagerId_fkey') THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_prospectionManagerId_fkey"
      FOREIGN KEY ("prospectionManagerId") REFERENCES "staff_members"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "documents_prospectionManagerId_idx" ON "documents"("prospectionManagerId");
CREATE INDEX IF NOT EXISTS "documents_paidAt_idx" ON "documents"("paidAt");

-- Historique : factures déjà payées → encaissées à leur date de facture.
UPDATE "documents"
SET "paidAt" = "issueDate"
WHERE "type" = 'invoice' AND "status" = 'paid' AND "paidAt" IS NULL;

-- Historique : client relié à une fiche Prospection du même cabinet → manager de la fiche.
UPDATE "documents" d
SET "prospectionManagerId" = c."managerId"
FROM "crm_companies" c
WHERE d."type" = 'invoice'
  AND d."prospectionManagerId" IS NULL
  AND c."clientId" = d."clientId"
  AND c."cabinet" = d."cabinet"
  AND c."managerId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "staff_members" s WHERE s.id = c."managerId");
