-- Affichage optionnel du RIB sur facture / devis
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "showRib" BOOLEAN NOT NULL DEFAULT false;

