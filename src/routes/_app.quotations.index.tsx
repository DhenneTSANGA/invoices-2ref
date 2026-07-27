import { createFileRoute } from "@tanstack/react-router";
import { DocumentsList } from "@/components/documents/DocumentsList";

export const Route = createFileRoute("/_app/quotations/")({
  head: () => ({ meta: [{ title: "Devis — 2R Hub" }] }),
  component: () => <DocumentsList type="quotation" />,
});
