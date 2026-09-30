import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/prospection/piste")({
  beforeLoad: () => {
    throw redirect({ to: "/prospection/pistes" });
  },
  component: () => null,
});
