-- Par ligne : masquer P.U. HT et total HT nuls (défaut : masqué)
ALTER TABLE "document_lines" ADD COLUMN IF NOT EXISTS "hideZeroFigures" BOOLEAN NOT NULL DEFAULT true;
