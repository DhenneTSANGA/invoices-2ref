import { createFileRoute } from "@tanstack/react-router";
import { LeadsBoard } from "@/components/prospection/LeadsBoard";

export const Route = createFileRoute("/prospection/pistes")({
  head: () => ({ meta: [{ title: "Pistes internes — Prospection" }] }),
  component: () => <LeadsBoard origin="interne" />,
});
