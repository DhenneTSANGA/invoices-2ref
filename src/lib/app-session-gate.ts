import { redirect, isRedirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { getAuthBootstrap } from "@/lib/admin.functions";
import { sessionKey } from "@/hooks/use-data";
import type { AppSession } from "@/lib/session.functions";
import {
  canAccessSpace,
  homePathForStaff,
  type AppSpace,
} from "@/lib/app-space";

/** Durée pendant laquelle on réutilise la session client sans re-bootstrap serveur. */
export const SESSION_CLIENT_TTL_MS = 5 * 60_000;

export function sessionFromCache(
  queryClient: QueryClient,
): NonNullable<AppSession> | null {
  const cached = queryClient.getQueryData<AppSession>(sessionKey);
  const state = queryClient.getQueryState(sessionKey);
  if (!cached || !state) return null;
  if (state.isInvalidated) return null;
  if (Date.now() - state.dataUpdatedAt > SESSION_CLIENT_TTL_MS) return null;
  return cached;
}

export async function requireReadySession(queryClient: QueryClient): Promise<{
  session: NonNullable<AppSession>;
}> {
  try {
    const cached = sessionFromCache(queryClient);
    if (cached) {
      return { session: cached };
    }

    const boot = await getAuthBootstrap();
    if (!boot) throw redirect({ to: "/login" });
    if (boot.status === "needs_password") {
      throw redirect({ to: "/auth/set-password" });
    }
    if (boot.status === "needs_onboarding") {
      throw redirect({ to: "/onboarding" });
    }
    if (boot.status === "account_removed") {
      throw redirect({ to: "/compte-supprime" });
    }
    if (boot.status === "access_denied" || boot.status !== "ready") {
      throw redirect({ to: "/login" });
    }

    const session = {
      user: boot.user,
      staff: boot.staff,
      activeCabinet: boot.activeCabinet,
    };
    queryClient.setQueryData(sessionKey, session);
    return { session };
  } catch (err) {
    if (isRedirect(err)) throw err;
    console.error("[requireReadySession]", err);
    throw redirect({ to: "/login" });
  }
}

/** Session prête + droit d’accès à l’espace demandé. */
export async function requireSpaceSession(
  queryClient: QueryClient,
  space: AppSpace,
): Promise<{ session: NonNullable<AppSession> }> {
  const { session } = await requireReadySession(queryClient);
  if (!canAccessSpace(session.staff, space)) {
    throw redirect({ to: homePathForStaff(session.staff) });
  }
  return { session };
}
