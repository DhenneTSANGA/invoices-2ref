import { createFileRoute, redirect } from "@tanstack/react-router";

/** Redirection vers /lettre (URL française). */
export const Route = createFileRoute("/_app/letters/")({
  beforeLoad: () => {
    throw redirect({ to: "/lettre" });
  },
});
