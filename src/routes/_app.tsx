import {
  createFileRoute,
  Outlet,
  redirect,
  useRouteContext,
  isRedirect,
} from "@tanstack/react-router";
import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageTransition } from "@/components/common/PageTransition";
import { getAuthBootstrap } from "@/lib/admin.functions";
import { sessionKey } from "@/hooks/use-data";
import { prefetchCommonAppData } from "@/lib/prefetch-app-data";
import { NotificationSync } from "@/components/layout/NotificationSync";
import { BrandTheme } from "@/components/layout/BrandTheme";
import type { AppSession } from "@/lib/session.functions";

/** Durée pendant laquelle on réutilise la session client sans re-bootstrap serveur. */
const SESSION_CLIENT_TTL_MS = 5 * 60_000;

function sessionFromCache(
  queryClient: QueryClient,
): NonNullable<AppSession> | null {
  const cached = queryClient.getQueryData<AppSession>(sessionKey);
  const state = queryClient.getQueryState(sessionKey);
  if (!cached || !state) return null;
  if (state.isInvalidated) return null;
  if (Date.now() - state.dataUpdatedAt > SESSION_CLIENT_TTL_MS) return null;
  return cached;
}

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    try {
      const cached = sessionFromCache(context.queryClient);
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
      context.queryClient.setQueryData(sessionKey, session);
      return { session };
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error("[_app] beforeLoad:", err);
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const { queryClient } = useRouteContext({ from: "__root__" });

  useEffect(() => {
    prefetchCommonAppData(queryClient);
  }, [queryClient]);

  return (
    <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-clip">
      <NotificationSync />
      <BrandTheme />
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="min-w-0 flex-1 overflow-x-clip px-3 py-5 sm:px-4 sm:py-6 md:px-8">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
