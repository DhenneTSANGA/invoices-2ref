import { createFileRoute } from "@tanstack/react-router";
import { DocumentsList } from "@/components/documents/DocumentsList";

export const Route = createFileRoute("/_app/lettre/")({
  head: () => ({ meta: [{ title: "Lettres — 2R Expertise Fiscale" }] }),
  component: () => <DocumentsList type="letter" />,
});
