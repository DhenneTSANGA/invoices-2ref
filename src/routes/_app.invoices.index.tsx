import { createFileRoute } from "@tanstack/react-router";
import { DocumentsList } from "@/components/documents/DocumentsList";

export const Route = createFileRoute("/_app/invoices/")({
  head: () => ({ meta: [{ title: "Factures — 2R Expertise Fiscale" }] }),
  component: () => <DocumentsList type="invoice" />,
});
