-- Comptes collaborateurs révoqués (affichage page compte supprimé au login)
CREATE TABLE IF NOT EXISTS "revoked_accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "authUserId" TEXT,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedById" TEXT,

    CONSTRAINT "revoked_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "revoked_accounts_email_key" ON "revoked_accounts"("email");
CREATE INDEX IF NOT EXISTS "revoked_accounts_authUserId_idx" ON "revoked_accounts"("authUserId");
