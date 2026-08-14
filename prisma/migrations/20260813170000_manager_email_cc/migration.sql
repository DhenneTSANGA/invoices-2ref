-- E-mail du gérant (CC envois clients) + historique CC sur mail_messages
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "managerEmail" TEXT;
ALTER TABLE "mail_messages" ADD COLUMN IF NOT EXISTS "ccEmail" TEXT;
