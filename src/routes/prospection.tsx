import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProspectionShell } from "@/components/prospection/ProspectionShell";
import { requireReadySession } from "@/lib/app-session-gate";

export const Route = createFileRoute("/prospection")({
  beforeLoad: async ({ context }) => requireReadySession(context.queryClient),
  component: ProspectionLayout,
});

function ProspectionLayout() {
  return (
    <ProspectionShell>
      <Outlet />
    </ProspectionShell>
  );
}
