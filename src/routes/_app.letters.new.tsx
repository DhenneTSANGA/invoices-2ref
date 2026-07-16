import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LetterEditor } from "@/components/editor/LetterEditor";

export const Route = createFileRoute("/_app/letters/new")({
  head: () => ({ meta: [{ title: "Nouvelle lettre — FacturIA" }] }),
  component: () => (
    <div>
      <button onClick={() => history.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      <PageHeader
        title="Nouvelle lettre commerciale"
        subtitle="Courrier professionnel adapté au contexte gabonais et CEMAC."
      />
      <LetterEditor />
    </div>
  ),
});
