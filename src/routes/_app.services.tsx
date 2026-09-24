import { createFileRoute, redirect } from "@tanstack/react-router";

/** Ancienne page Catalogue — redirige pour ne pas casser les favoris. */
export const Route = createFileRoute("/_app/services")({
  beforeLoad: () => {
    throw redirect({ to: "/invoices" });
  },
});
