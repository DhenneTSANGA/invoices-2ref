import { prisma } from "@/lib/prisma";

export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function isAccountRevoked(opts: {
  email?: string | null;
  authUserId?: string | null;
}): Promise<boolean> {
  const email = opts.email ? normalizeAccountEmail(opts.email) : null;
  const authUserId = opts.authUserId?.trim() || null;
  if (!email && !authUserId) return false;

  try {
    const row = await prisma.revokedAccount.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(authUserId ? [{ authUserId }] : []),
        ],
      },
      select: { id: true },
    });
    return Boolean(row);
  } catch (err) {
    // Ne pas faire tomber login / bootstrap si la DB est momentanément injoignable
    console.error("[isAccountRevoked]", err);
    return false;
  }
}

export async function recordRevokedAccount(opts: {
  email: string;
  authUserId: string;
  revokedById?: string | null;
}): Promise<void> {
  const email = normalizeAccountEmail(opts.email);
  await prisma.revokedAccount.upsert({
    where: { email },
    create: {
      email,
      authUserId: opts.authUserId,
      revokedById: opts.revokedById ?? null,
    },
    update: {
      authUserId: opts.authUserId,
      revokedById: opts.revokedById ?? null,
      revokedAt: new Date(),
    },
  });
}

/** Si un accès est recréé pour le même e-mail, on retire la révocation. */
export async function clearRevokedAccount(email: string): Promise<void> {
  const normalized = normalizeAccountEmail(email);
  await prisma.revokedAccount.deleteMany({ where: { email: normalized } });
}
