import { createFileRoute } from "@tanstack/react-router";
import { LeadsBoard } from "@/components/prospection/LeadsBoard";

export const Route = createFileRoute("/prospection/pistes-externes")({
  head: () => ({ meta: [{ title: "Pistes externes — Prospection" }] }),
  component: () => <LeadsBoard origin="externe" />,
});
