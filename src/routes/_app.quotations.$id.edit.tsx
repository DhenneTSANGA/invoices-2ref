import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { useDocument } from "@/hooks/use-data";

export const Route = createFileRoute("/_app/quotations/$id/edit")({
  head: () => ({ meta: [{ title: "Modifier le devis — 2R Hub" }] }),
  component: EditQuotation,
});

function EditQuotation() {
  const { id } = Route.useParams();
  const { data: doc, isLoading } = useDocument(id);

  if (isLoading) {
    return (
      <LoadingState
        icon={FileText}
        title="Chargement"
        description="Ouverture du devis pour modification…"
      />
    );
  }

  if (!doc || doc.type !== "quotation") {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center">
        Devis introuvable.
        <div className="mt-3">
          <Link to="/quotations" className="text-sm text-primary hover:underline">
            Retour aux devis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/quotations/$id"
        params={{ id: doc.id }}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à la fiche
      </Link>
      <PageHeader
        title={`Modifier ${doc.number}`}
        subtitle="Ajoutez ou retirez des lignes de désignation."
      />
      <DocumentEditor type="quotation" initial={doc} />
    </div>
  );
}
