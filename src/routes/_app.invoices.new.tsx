import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

export const Route = createFileRoute("/_app/invoices/new")({
  head: () => ({ meta: [{ title: "Nouvelle facture — 2R Hub" }] }),
  component: () => (
    <div>
      <button
        type="button"
        onClick={() => history.back()}
        className="mb-4 back-link"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      <PageHeader
        title="Nouvelle facture"
        subtitle="Composez votre facture standard OHADA / CEMAC."
      />
      <DocumentEditor type="invoice" />
    </div>
  ),
});
