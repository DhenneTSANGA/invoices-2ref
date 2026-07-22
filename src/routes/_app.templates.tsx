import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { FileText, ReceiptText, Mail, Eye } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import type { Document, DocumentType } from "@/store/types";
import { computeTotals } from "@/lib/document-math";
import { useClients } from "@/hooks/use-data";

export const Route = createFileRoute("/_app/templates")({
  head: () => ({ meta: [{ title: "Modèles de documents — 2R Expertise Fiscale" }] }),
  component: Templates,
});

const META: {
  id: DocumentType;
  name: string;
  description: string;
  icon: typeof FileText;
  gradient: string;
  to: "/invoices/new" | "/quotations/new" | "/lettre/new";
  accent: string;
}[] = [
  {
    id: "invoice",
    name: "Facture standard",
    description: "Modèle Excel-like avec NIF, NIU, RCCM et mentions OHADA / CEMAC (XAF, TVA 18 %).",
    icon: ReceiptText,
    gradient: "bg-gradient-primary",
    to: "/invoices/new",
    accent: "#1E40AF",
  },
  {
    id: "quotation",
    name: "Devis professionnel",
    description: "Proposition chiffrée avec validité, conditions de réalisation et bon pour accord. Utilisez aussi ce modèle pour une pro forma.",
    icon: FileText,
    gradient: "bg-gradient-success",
    to: "/quotations/new",
    accent: "#0F766E",
  },
  {
    id: "letter",
    name: "Lettre commerciale",
    description: "Courrier structuré (relance, proposition, réclamation) au format professionnel gabonais.",
    icon: Mail,
    gradient: "bg-gradient-accent",
    to: "/lettre/new",
    accent: "#B45309",
  },
];

function Templates() {
  const sampleDocs = useSampleDocs();
  const [preview, setPreview] = useState<Document | null>(null);

  return (
    <div>
      <PageHeader
        title="Modèles de documents"
        subtitle="Trois modèles adaptés au Gabon et à la zone CEMAC — facture, devis et lettre."
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {META.map((t, i) => {
          const doc = sampleDocs[t.id];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4, scale: 1.01 }}
              className="glass-panel group relative overflow-hidden rounded-3xl p-5 shadow-soft hover:shadow-glow transition-shadow"
            >
              <div className={`absolute -right-12 -top-12 h-40 w-40 rounded-full ${t.gradient} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`} aria-hidden />
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${t.gradient} text-white shadow-glow`}>
                <t.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{t.description}</p>

              <button
                type="button"
                onClick={() => setPreview(doc)}
                className="mt-4 block w-full overflow-hidden rounded-2xl border border-border/60 bg-[#F8FAFC] p-2 text-left transition hover:ring-2 hover:ring-primary/30"
                title="Aperçu plein écran"
              >
                <div className="relative mx-auto overflow-hidden" style={{ width: 820 * 0.28, height: 820 * 1.414 * 0.28 }}>
                  <div className="pointer-events-none absolute left-0 top-0 origin-top-left scale-[0.28]">
                    <DocumentPreview doc={doc} variant="thumb" />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Eye className="h-3 w-3" /> Aperçu
                </div>
              </button>

              <Link
                to={t.to}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
              >
                Utiliser ce modèle
              </Link>
            </motion.div>
          );
        })}
      </div>

      {preview && (
        <DocumentPreviewModal doc={preview} open={!!preview} onOpenChange={(o) => !o && setPreview(null)} />
      )}
    </div>
  );
}

function useSampleDocs(): Record<DocumentType, Document> {
  const { data: clients = [] } = useClients();
  const clientId = clients[0]?.id ?? "";

  return useMemo(() => {
    const items = [
      {
        id: "tpl-1",
        description: "Tenue de comptabilité mensuelle",
        quantity: 1,
        unitPrice: 250000,
        vatRate: 18,
        discount: 0,
        tpsRate: 9.5,
        cssRate: 1,
      },
      {
        id: "tpl-2",
        description: "Déclaration TVA mensuelle",
        quantity: 1,
        unitPrice: 75000,
        vatRate: 18,
        discount: 0,
        tpsRate: 9.5,
        cssRate: 1,
      },
    ];
    const totals = computeTotals(items);
    const base = {
      cabinet: "expertise_fiscale" as const,
      clientId,
      status: "draft" as const,
      issueDate: "2025-11-20",
      dueDate: "2025-12-20",
      items,
      ...totals,
      currency: "XAF",
    };

    return {
      invoice: {
        ...base,
        id: "tpl-invoice",
        type: "invoice" as const,
        number: "FA-2025-0150",
        notes: "Règlement par virement bancaire.",
        paymentTerms: "30 jours fin de mois",
      },
      quotation: {
        ...base,
        id: "tpl-quotation",
        type: "quotation" as const,
        number: "DV-2025-0100",
        validityDays: 30,
        executionTerms: "Délai d'exécution : 15 jours ouvrés après acceptation à Libreville.",
        paymentTerms: "Acompte 40 % — solde à livraison.",
        notes: "Proposition commerciale.",
      },
      proforma: {
        ...base,
        id: "tpl-proforma",
        type: "proforma" as const,
        number: "PF-2025-0020",
        incoterm: "CIP Libreville",
        shippingNotes: "Transport et assurance inclus jusqu'à Libreville (CEMAC).",
        disclaimer:
          "Document prévisionnel sans valeur comptable ni fiscale. Ne constitue pas une facture définitive.",
        paymentTerms: "Virement en XAF sur facture définitive.",
      },
      letter: {
        ...base,
        id: "tpl-letter",
        type: "letter" as const,
        number: "LT-2025-012",
        items: [],
        subtotal: 0,
        tps: 0,
        css: 0,
        vat: 0,
        total: 0,
        subject: "Relance de paiement — facture en souffrance",
        salutation: "Madame, Monsieur,",
        body:
          "Nous nous permettons de vous rappeler que la facture mentionnée en référence demeure impayée à ce jour.\n\nNous vous serions reconnaissants de bien vouloir procéder au règlement dans les meilleurs délais.\n\nNous restons à votre disposition.",
        closing: "Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",
        signatoryTitle: "Expert-comptable",
      },
    };
  }, [clientId]);
}
