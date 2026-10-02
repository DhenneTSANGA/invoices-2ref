import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/prospection/pipeline")({
  beforeLoad: () => {
    throw redirect({ to: "/prospection/opportunites" });
  },
  component: () => null,
});
