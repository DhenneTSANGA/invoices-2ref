import { createFileRoute, Outlet, redirect, useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageTransition } from "@/components/common/PageTransition";
import { getCurrentSession } from "@/lib/session.functions";
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
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
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
    <div className="flex min-h-screen w-full">
      <NotificationSync />
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopbar />
        <main className="flex-1 px-4 py-6 md:px-8">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
