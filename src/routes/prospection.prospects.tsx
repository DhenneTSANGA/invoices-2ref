import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/prospection/prospects")({
  component: () => <Outlet />,
});
