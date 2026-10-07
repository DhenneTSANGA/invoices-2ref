import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { useDocument, useSession } from "@/hooks/use-data";
import { canEditInvoiceContent } from "@/lib/roles";

export const Route = createFileRoute("/_app/invoices/$id/edit")({
  head: () => ({ meta: [{ title: "Modifier la facture — 2R Hub" }] }),
  component: EditInvoice,
});

function EditInvoice() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data: doc, isLoading } = useDocument(id);

  const allowed =
    Boolean(session && doc) &&
    canEditInvoiceContent(
      session!.staff.role,
      session!.staff.id,
      doc!.createdById,
    );

  useEffect(() => {
    if (isLoading || !doc || !session) return;
    if (
      !canEditInvoiceContent(
        session.staff.role,
        session.staff.id,
        doc.createdById,
      )
    ) {
      void navigate({ to: "/invoices/$id", params: { id: doc.id }, replace: true });
    }
  }, [doc, session, isLoading, navigate]);

  if (isLoading) {
    return (
      <LoadingState
        icon={FileText}
        title="Chargement"
        description="Ouverture de la facture pour modification…"
      />
    );
  }

  if (!doc || doc.type !== "invoice") {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center">
        Facture introuvable.
        <div className="mt-3">
          <Link to="/invoices" className="text-sm text-primary hover:underline">
            Retour aux factures
          </Link>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <LoadingState
        icon={FileText}
        title="Facture non modifiable"
        description="Redirection vers la fiche…"
      />
    );
  }

  return (
    <div>
      <Link
        to="/invoices/$id"
        params={{ id: doc.id }}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à la fiche
      </Link>
      <PageHeader
        title={`Modifier ${doc.number}`}
        subtitle={
          doc.isSubscription
            ? "Modèle d'abonnement — les prochaines factures mensuelles reprendront ces lignes."
            : "Ajoutez ou retirez des lignes de désignation."
        }
      />
      <DocumentEditor type="invoice" initial={doc} />
    </div>
  );
}
