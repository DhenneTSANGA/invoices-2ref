-- Période optionnelle affichée sur la facture (format AAAA-MM, null = aucune)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "period" TEXT;
