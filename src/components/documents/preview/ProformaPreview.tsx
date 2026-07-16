import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { number, longDate } from "@/lib/format";
import { AmountRow, LegalFooter, PreviewLogo, PreviewShell } from "./PreviewShell";
import { ItemsTable, PartyBlock, StampBox } from "./InvoicePreview";

type Props = { doc: Document; compact?: boolean; variant?: "full" | "thumb"; className?: string };

const ACCENT = "#475569";
const ACCENT_TO = "#64748B";

export const ProformaPreview = forwardRef<HTMLDivElement, Props>(function ProformaPreview(
  { doc, compact, variant = "full", className },
  ref,
) {
  const company = useAppStore((s) => s.company);
  const client = useAppStore((s) => s.clients.find((c) => c.id === doc.clientId));
  const isThumb = variant === "thumb";
  const disclaimer =
    doc.disclaimer ||
    "Document prévisionnel sans valeur comptable ni fiscale. Ne constitue pas une facture définitive et n'ouvre aucun droit à recouvrement.";

  return (
    <PreviewShell innerRef={ref} accent={ACCENT} compact={compact} isThumb={isThumb} className={className}>
      <div className="relative">
        <div className="pointer-events-none absolute right-0 top-8 rotate-12 select-none rounded border-2 border-[#94A3B8] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]/80">
          Pro forma
        </div>

        <div className="flex items-start justify-between border-b-2 border-[#64748B] pb-5">
          <div className="flex items-center gap-3">
            <PreviewLogo from={ACCENT} to={ACCENT_TO} />
            <div>
              <div className="font-display text-lg font-bold tracking-tight text-[#334155]">{company.name}</div>
              <div className="text-[10px] text-[#64748B]">{company.tagline}</div>
            </div>
          </div>
          <div className="text-right pr-16">
            <div className="font-display text-[20px] font-bold uppercase tracking-wide text-[#334155]">Facture pro forma</div>
            <div className="mt-1 text-[11px] font-semibold">N° {doc.number}</div>
            <div className="text-[10px] text-[#64748B]">{longDate(doc.issueDate)}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#F1F5F9] px-3 py-2 text-[10px] text-[#334155] ring-1 ring-[#CBD5E1]">
        <b>Mention obligatoire —</b> {disclaimer}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-6">
        <PartyBlock title="Fournisseur" accent="#64748B" name={company.name} lines={[company.address, company.city, `${company.phone} · ${company.email}`]} nif={company.nif} niu={company.niu} rccm={company.rccm} muted />
        <PartyBlock title="Destinataire" accent={ACCENT} name={client?.name} lines={client ? [client.address, `${client.city}, ${client.country}`, `${client.contactName} · ${client.email}`] : undefined} nif={client?.nif} niu={client?.niu} rccm={client?.rccm} bordered />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-[#475569]">
        <span>Émission : <b className="text-[#0F172A]">{longDate(doc.issueDate)}</b></span>
        <span>Estimation valable jusqu'au : <b className="text-[#0F172A]">{longDate(doc.dueDate)}</b></span>
        {doc.incoterm && <span>Incoterm : <b className="text-[#0F172A]">{doc.incoterm}</b></span>}
      </div>

      <ItemsTable doc={doc} headerFrom={ACCENT} headerTo={ACCENT_TO} />

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="space-y-3">
          {(doc.shippingNotes || doc.notes) && (
            <div className="rounded-lg bg-[#F8FAFC] p-3 ring-1 ring-[#E2E8F0]">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">Conditions de vente / transport</div>
              <p className="mt-1 text-[10px] text-[#334155]">{doc.shippingNotes || doc.notes}</p>
            </div>
          )}
          <div className="rounded-lg bg-[#F1F5F9] p-3 text-[9px] text-[#475569]">
            <div><b>Conditions de paiement estimatives</b></div>
            <div className="mt-1">{doc.paymentTerms || "Virement bancaire en XAF — confirmation sur facture définitive."}</div>
          </div>
          <StampBox accent={ACCENT} />
        </div>
        <div className="ml-auto w-full max-w-xs">
          <div className="overflow-hidden rounded-lg ring-1 ring-[#CBD5E1]">
            <AmountRow label="Sous-total HT estimé" value={number(doc.subtotal)} currency={doc.currency} accent={ACCENT} />
            <AmountRow label="TVA estimée (18 %)" value={number(doc.vat)} currency={doc.currency} accent={ACCENT} />
            <AmountRow label="Total estimé TTC" value={number(doc.total)} currency={doc.currency} strong accent={ACCENT} />
          </div>
          <div className="mt-2 rounded-lg bg-[#F1F5F9] p-2 text-[9px] text-[#475569]">
            <div><b>Banque (indicatif)</b></div>
            <div>{company.bankName} — {company.bankAccount}</div>
          </div>
        </div>
      </div>

      <LegalFooter {...company} />
    </PreviewShell>
  );
});
