import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/prospection/clients")({
  component: () => <Outlet />,
});
