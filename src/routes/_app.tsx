import {
  createFileRoute,
  Outlet,
  useRouteContext,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageTransition } from "@/components/common/PageTransition";
import { prefetchCommonAppData } from "@/lib/prefetch-app-data";
import { NotificationSync } from "@/components/layout/NotificationSync";
import { BrandTheme } from "@/components/layout/BrandTheme";
import { requireSpaceSession } from "@/lib/app-session-gate";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) =>
    requireSpaceSession(context.queryClient, "facturation"),
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
