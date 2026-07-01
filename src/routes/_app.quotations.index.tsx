import { createFileRoute } from "@tanstack/react-router";
import { DocumentsList } from "@/components/documents/DocumentsList";

export const Route = createFileRoute("/_app/quotations/")({
  head: () => ({ meta: [{ title: "Devis — FacturIA" }] }),
  component: () => <DocumentsList type="quotation" />,
});
