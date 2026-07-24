import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { number, longDate } from "@/lib/format";
import { AmountRow, LegalFooter, PreviewLogo, PreviewShell, AmountInWords, PreviewBottomRow } from "./PreviewShell";
import {
  ItemsTable,
  PartyBlock,
  StampBox,
  partyAddressLines,
  partyContactLine,
} from "./InvoicePreview";

type Props = { doc: Document; compact?: boolean; variant?: "full" | "thumb"; className?: string };

const ACCENT = "#0F766E";
const ACCENT_TO = "#14B8A6";

export const QuotationPreview = forwardRef<HTMLDivElement, Props>(function QuotationPreview(
  { doc, compact, variant = "full", className },
  ref,
) {
  const { company, client } = usePreviewData(doc);
  const isThumb = variant === "thumb";
  const validity = doc.validityDays ?? 30;

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
      <div className="flex items-start justify-between gap-4 border-b-2 pb-5" style={{ borderColor: ACCENT }}>
        <div className="flex min-w-0 items-center gap-3">
          <PreviewLogo cabinet={doc.cabinet} />
          <div className="min-w-0">
            <div className="font-display text-xl font-bold tracking-tight leading-tight" style={{ color: ACCENT }}>
              {company.name}
            </div>
            {company.tagline ? (
              <div className="mt-0.5 text-[12px] leading-snug text-[#64748B]">{company.tagline}</div>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-[28px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Devis</div>
          <div className="mt-1 text-[13px] font-semibold">N° {doc.number}</div>
          <div className="text-[12px] text-[#64748B]">{longDate(doc.issueDate)}</div>
        </div>
      </div>

      <div className="mt-4 rounded-xl px-3.5 py-2.5 text-[12px] font-medium text-[#0F766E]" style={{ background: "#F0FDFA", border: "1px solid #99F6E4" }}>
        Proposition commerciale valable <b>{validity} jours</b> à compter de la date d'émission — acceptation écrite requise (OHADA / Gabon).
      </div>

      <div className="mt-4 grid grid-cols-2 gap-6">
        <PartyBlock
          title="Émetteur"
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
          title="Client"
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
        <span>Validité jusqu'au : <b className="text-[#0F172A]">{longDate(doc.dueDate)}</b></span>
      </div>

      <ItemsTable doc={doc} headerFrom={ACCENT} headerTo={ACCENT_TO} showTaxColumns />

      <PreviewBottomRow
        left={
          <div className="space-y-3">
            {(doc.executionTerms || doc.notes) && (
              <div className="rounded-lg bg-[#F0FDFA] p-3.5 ring-1 ring-[#99F6E4]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E]">Conditions de réalisation</div>
                <p className="mt-1 text-[12px] text-[#134E4A]">{doc.executionTerms || doc.notes}</p>
              </div>
            )}
            {doc.paymentTerms && (
              <div className="rounded-lg bg-[#F0FDFA] p-2.5 text-[11px] text-[#134E4A]">
                <div><b>Modalités de paiement</b></div>
                <div className="mt-1">{doc.paymentTerms}</div>
              </div>
            )}
            <StampBox accent={ACCENT} />
          </div>
        }
        right={
          <div className="w-full space-y-2">
            <div className="overflow-hidden rounded-lg ring-1 ring-[#99F6E4]">
              <AmountRow label="Sous-total HT" value={number(doc.subtotal)} currency={doc.currency} accent={ACCENT} />
              <AmountRow label="TPS" value={number(doc.tps ?? 0)} currency={doc.currency} accent={ACCENT} />
              <AmountRow label="CSS" value={number(doc.css ?? 0)} currency={doc.currency} accent={ACCENT} />
              <AmountRow label="TVA (18 %)" value={number(doc.vat)} currency={doc.currency} accent={ACCENT} />
              <AmountRow label="Total TTC" value={number(doc.total)} currency={doc.currency} strong accent={ACCENT} />
            </div>
            <AmountInWords amount={doc.total} currency={doc.currency} accent={ACCENT} />
            {(company.bankName || company.bankAccount) && (
              <div className="rounded-lg bg-[#F0FDFA] p-2.5 text-[11px] text-[#134E4A]">
                <div><b>Coordonnées bancaires</b></div>
                <div className="mt-1 break-words">{[company.bankName, company.bankAccount].filter(Boolean).join(" — ")}</div>
              </div>
            )}
          </div>
        }
      />

      <LegalFooter {...company} />
    </PreviewShell>
  );
});
