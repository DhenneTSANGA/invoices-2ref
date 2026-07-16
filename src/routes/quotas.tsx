import { createFileRoute, redirect } from "@tanstack/react-router";

/** Alias fréquent pour /quotations (devis). */
export const Route = createFileRoute("/quotas")({
  beforeLoad: () => {
    throw redirect({ to: "/quotations" });
  },
});
