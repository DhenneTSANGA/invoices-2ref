-- Modèles d’e-mails de relance (objet + intro par palier 15/20/25)
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "reminderTemplates" JSONB;
