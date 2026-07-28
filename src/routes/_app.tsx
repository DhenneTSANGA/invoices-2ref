import { createFileRoute, Outlet, redirect, useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageTransition } from "@/components/common/PageTransition";
import { getAuthBootstrap } from "@/lib/admin.functions";
import {
  sessionKey,
  clientsKey,
  companyKey,
  servicesKey,
} from "@/hooks/use-data";
import { listClients, getCompany, listServices } from "@/lib/data.functions";
import { NotificationSync } from "@/components/layout/NotificationSync";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    const boot = await getAuthBootstrap();
    if (!boot) throw redirect({ to: "/login" });
    if (boot.status === "needs_password") {
      throw redirect({ to: "/auth/set-password" });
    }
    if (boot.status === "needs_onboarding") {
      throw redirect({ to: "/onboarding" });
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
  },
  component: AppLayout,
});

function AppLayout() {
  const { queryClient } = useRouteContext({ from: "__root__" });

  // Précharge les données communes dès l'entrée dans l'app
  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: clientsKey,
      queryFn: () => listClients(),
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: companyKey,
      queryFn: () => getCompany(),
      staleTime: 5 * 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: servicesKey,
      queryFn: () => listServices(),
      staleTime: 5 * 60_000,
    });
  }, [queryClient]);

  return (
    <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-clip">
      <NotificationSync />
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
