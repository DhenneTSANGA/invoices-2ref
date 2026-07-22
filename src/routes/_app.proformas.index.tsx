import { createFileRoute } from "@tanstack/react-router";
import { DocumentsList } from "@/components/documents/DocumentsList";

export const Route = createFileRoute("/_app/proformas/")({
  head: () => ({ meta: [{ title: "Pro forma — 2R Expertise Fiscale" }] }),
  component: () => <DocumentsList type="proforma" />,
});
