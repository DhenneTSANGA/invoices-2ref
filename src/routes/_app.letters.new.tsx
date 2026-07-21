import { createFileRoute, redirect } from "@tanstack/react-router";

/** Redirection vers /lettre/new. */
export const Route = createFileRoute("/_app/letters/new")({
  beforeLoad: () => {
    throw redirect({ to: "/lettre/new" });
  },
});
