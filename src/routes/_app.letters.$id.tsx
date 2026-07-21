import { createFileRoute, redirect } from "@tanstack/react-router";

/** Redirection vers /lettre/$id. */
export const Route = createFileRoute("/_app/letters/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/lettre/$id", params: { id: params.id } });
  },
});
