import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { number, longDate } from "@/lib/format";
import { AmountRow, LegalFooter, PreviewLogo, PreviewShell, PreviewBottomRow } from "./PreviewShell";
import {
  ItemsTable,
  PartyBlock,
  StampBox,
  partyAddressLines,
  partyContactLine,
} from "./InvoicePreview";

type Props = { doc: Document; compact?: boolean; variant?: "full" | "thumb"; className?: string };

const ACCENT = "#475569";
const ACCENT_TO = "#64748B";

export const ProformaPreview = forwardRef<HTMLDivElement, Props>(function ProformaPreview(
  { doc, compact, variant = "full", className },
  ref,
) {
  const { company, client } = usePreviewData(doc);
  const isThumb = variant === "thumb";
  const disclaimer =
    doc.disclaimer ||
    "Document prévisionnel sans valeur comptable ni fiscale. Ne constitue pas une facture définitive et n'ouvre aucun droit à recouvrement.";

  const emitterLines = partyAddressLines([
    company.address,
    company.city,
    partyContactLine([company.phone, company.email]),
    company.website,
  ]);

  const clientLines = client
    ? partyAddressLines([
        client.address,
        [client.city, client.country].filter(Boolean).join(", "),
        partyContactLine([client.contactName, client.email, client.phone]),
      ])
    : undefined;

  return (
    <PreviewShell innerRef={ref} accent={ACCENT} compact={compact} isThumb={isThumb} className={className}>
      <div className="relative">
        <div className="pointer-events-none absolute right-0 top-8 rotate-12 select-none rounded border-2 border-[#94A3B8] px-3 py-1 text-[13px] font-bold uppercase tracking-widest text-[#94A3B8]/80">
          Pro forma
        </div>

        <div className="flex items-start justify-between gap-4 border-b-2 border-[#64748B] pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <PreviewLogo cabinet={doc.cabinet} />
            <div className="min-w-0">
              <div className="font-display text-xl font-bold tracking-tight leading-tight text-[#334155]">
                {company.name}
              </div>
              {company.tagline ? (
                <div className="mt-0.5 text-[12px] leading-snug text-[#64748B]">{company.tagline}</div>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 text-right pr-16">
            <div className="font-display text-[24px] font-bold uppercase tracking-wide text-[#334155]">Facture pro forma</div>
            <div className="mt-1 text-[13px] font-semibold">N° {doc.number}</div>
            <div className="text-[12px] text-[#64748B]">{longDate(doc.issueDate)}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#F1F5F9] px-3.5 py-2.5 text-[12px] text-[#334155] ring-1 ring-[#CBD5E1]">
        <b>Mention obligatoire —</b> {disclaimer}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-6">
        <PartyBlock
          title="Fournisseur"
          accent="#64748B"
          name={company.name}
          lines={emitterLines}
          nif={company.nif}
          niu={company.niu}
          rccm={company.rccm}
          cnss={company.cnss}
          muted
        />
        <PartyBlock
          title="Destinataire"
          accent={ACCENT}
          name={client?.name}
          lines={clientLines}
          nif={client?.nif}
          niu={client?.niu}
          rccm={client?.rccm}
          bordered
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-[#475569]">
        <span>Émission : <b className="text-[#0F172A]">{longDate(doc.issueDate)}</b></span>
        <span>Estimation valable jusqu'au : <b className="text-[#0F172A]">{longDate(doc.dueDate)}</b></span>
        {doc.incoterm && <span>Incoterm : <b className="text-[#0F172A]">{doc.incoterm}</b></span>}
      </div>

      <ItemsTable doc={doc} headerFrom={ACCENT} headerTo={ACCENT_TO} showTaxColumns />

      <PreviewBottomRow
        left={
          <div className="space-y-3">
            {(doc.shippingNotes || doc.notes) && (
              <div className="rounded-lg bg-[#F8FAFC] p-3.5 ring-1 ring-[#E2E8F0]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Conditions de vente / transport</div>
                <p className="mt-1 text-[12px] text-[#334155]">{doc.shippingNotes || doc.notes}</p>
              </div>
            )}
            <div className="rounded-lg bg-[#F1F5F9] p-3.5 text-[11px] text-[#475569]">
              <div><b>Conditions de paiement estimatives</b></div>
              <div className="mt-1">{doc.paymentTerms || "Virement bancaire en XAF — confirmation sur facture définitive."}</div>
            </div>
            <StampBox accent={ACCENT} />
          </div>
        }
        right={
          <div className="w-full space-y-2">
            <div className="overflow-hidden rounded-lg ring-1 ring-[#CBD5E1]">
              <AmountRow label="Sous-total HT estimé" value={number(doc.subtotal)} currency={doc.currency} accent={ACCENT} />
              <AmountRow label="TPS" value={number(doc.tps ?? 0)} currency={doc.currency} accent={ACCENT} />
              <AmountRow label="CSS" value={number(doc.css ?? 0)} currency={doc.currency} accent={ACCENT} />
              <AmountRow label="TVA estimée (18 %)" value={number(doc.vat)} currency={doc.currency} accent={ACCENT} />
              <AmountRow label="Total estimé TTC" value={number(doc.total)} currency={doc.currency} strong accent={ACCENT} />
            </div>
            {(company.bankName || company.bankAccount) && (
              <div className="rounded-lg bg-[#F1F5F9] p-2.5 text-[11px] text-[#475569]">
                <div><b>Banque (indicatif)</b></div>
                <div className="break-words">{[company.bankName, company.bankAccount].filter(Boolean).join(" — ")}</div>
              </div>
            )}
          </div>
        }
      />

      <LegalFooter {...company} />
    </PreviewShell>
  );
});
