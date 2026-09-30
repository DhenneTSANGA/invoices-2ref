import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/prospection/actions")({
  beforeLoad: () => {
    throw redirect({ to: "/prospection/activites" });
  },
  component: () => null,
});
