-- Les documents suivent le pôle métier du client (plus le défaut formation).
UPDATE "documents" AS d
SET pole = c.pole
FROM "clients" AS c
WHERE d."clientId" = c.id
  AND d.pole IS DISTINCT FROM c.pole;
