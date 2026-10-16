-- Un super admin (direction) peut aussi porter un portefeuille de manager :
-- objectifs, classement, routage des pistes et budget, sans perdre ses droits.
ALTER TABLE "staff_members" ADD COLUMN IF NOT EXISTS "crmPortfolio" BOOLEAN NOT NULL DEFAULT false;
