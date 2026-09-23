-- Papier 2R Conseil : masquer qté / P.U. HT / total nuls (défaut : masqué)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "hideZeroLineFigures" BOOLEAN NOT NULL DEFAULT true;
