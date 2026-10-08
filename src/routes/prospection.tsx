import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProspectionShell } from "@/components/prospection/ProspectionShell";
import { requireSpaceSession } from "@/lib/app-session-gate";

export const Route = createFileRoute("/prospection")({
  beforeLoad: async ({ context }) =>
    requireSpaceSession(context.queryClient, "prospection"),
  component: ProspectionLayout,
});

function ProspectionLayout() {
  return (
    <ProspectionShell>
      <Outlet />
    </ProspectionShell>
  );
}
