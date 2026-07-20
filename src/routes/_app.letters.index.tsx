import { createFileRoute } from "@tanstack/react-router";
import { DocumentsList } from "@/components/documents/DocumentsList";

export const Route = createFileRoute("/_app/letters/")({
  head: () => ({ meta: [{ title: "Lettres — 2REF-AUTO" }] }),
  component: () => <DocumentsList type="letter" />,
});
