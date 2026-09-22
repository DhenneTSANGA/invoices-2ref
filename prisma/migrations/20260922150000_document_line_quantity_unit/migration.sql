-- Unité optionnelle de la colonne quantité (qté / mois / année / aucune)
ALTER TABLE "document_lines" ADD COLUMN IF NOT EXISTS "quantityUnit" TEXT NOT NULL DEFAULT 'quantity';
