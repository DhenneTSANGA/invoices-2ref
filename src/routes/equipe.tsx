import { createFileRoute, redirect } from "@tanstack/react-router";

/** Alias demandé : /equipe → page Équipe (/users). */
export const Route = createFileRoute("/equipe")({
  beforeLoad: () => {
    throw redirect({ to: "/users" });
  },
});
