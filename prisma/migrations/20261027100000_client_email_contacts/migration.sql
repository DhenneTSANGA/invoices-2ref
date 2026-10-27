-- Fiche client : civilité et nom par adresse e-mail supplémentaire.
ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "extraEmailContacts" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Reprise des adresses supplémentaires déjà saisies (sans civilité).
UPDATE "clients"
SET "extraEmailContacts" = (
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('email', e, 'civility', '', 'name', '')),
    '[]'::jsonb
  )
  FROM unnest("extraEmails") AS e
)
WHERE "extraEmailContacts" = '[]'::jsonb
  AND cardinality("extraEmails") > 0;
