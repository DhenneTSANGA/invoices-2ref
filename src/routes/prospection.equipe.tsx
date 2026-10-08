import { createFileRoute, redirect } from "@tanstack/react-router";
import { TeamAdminPage } from "@/components/admin/TeamAdminPage";
import { canManageAdminRequests } from "@/lib/roles";

export const Route = createFileRoute("/prospection/equipe")({
  head: () => ({ meta: [{ title: "Équipe — Prospection" }] }),
  beforeLoad: ({ context }) => {
    const session = context.session;
    if (!session || !canManageAdminRequests(session.staff.role)) {
      throw redirect({ to: "/prospection" });
    }
  },
  component: TeamAdminPage,
});
