import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

export const Route = createFileRoute("/_app/proformas/new")({
  head: () => ({ meta: [{ title: "Nouvelle pro forma — 2REF-AUTO" }] }),
  component: () => (
    <div>
      <button onClick={() => history.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      <PageHeader
        title="Nouvelle facture pro forma"
        subtitle="Estimation officielle sans valeur comptable — adaptée zone CEMAC."
      />
      <DocumentEditor type="proforma" />
    </div>
  ),
});
