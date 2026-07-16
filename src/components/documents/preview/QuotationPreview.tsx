import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { number, longDate } from "@/lib/format";
import { AmountRow, LegalFooter, PreviewLogo, PreviewShell } from "./PreviewShell";
import { ItemsTable, PartyBlock, StampBox } from "./InvoicePreview";

type Props = { doc: Document; compact?: boolean; variant?: "full" | "thumb"; className?: string };

const ACCENT = "#B45309";
const ACCENT_TO = "#D97706";

export const QuotationPreview = forwardRef<HTMLDivElement, Props>(function QuotationPreview(
  { doc, compact, variant = "full", className },
  ref,
) {
  const company = useAppStore((s) => s.company);
  const client = useAppStore((s) => s.clients.find((c) => c.id === doc.clientId));
  const isThumb = variant === "thumb";
  const validity = doc.validityDays ?? 30;

  return (
    <PreviewShell innerRef={ref} accent={ACCENT} compact={compact} isThumb={isThumb} className={className}>
      <div className="flex items-start justify-between border-b-2 pb-5" style={{ borderColor: ACCENT }}>
        <div className="flex items-center gap-3">
          <PreviewLogo from={ACCENT} to={ACCENT_TO} />
          <div>
            <div className="font-display text-lg font-bold tracking-tight" style={{ color: ACCENT }}>{company.name}</div>
            <div className="text-[10px] text-[#64748B]">{company.tagline}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-[24px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Devis</div>
          <div className="mt-1 text-[11px] font-semibold">N° {doc.number}</div>
          <div className="text-[10px] text-[#64748B]">{longDate(doc.issueDate)}</div>
        </div>
      </div>

      <div className="mt-4 rounded-xl px-3 py-2 text-[10px] font-medium text-[#92400E]" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
        Proposition commerciale valable <b>{validity} jours</b> à compter de la date d'émission — acceptation écrite requise (OHADA / Gabon).
      </div>

      <div className="mt-4 grid grid-cols-2 gap-6">
        <PartyBlock title="Émetteur" accent="#64748B" name={company.name} lines={[company.address, company.city, `${company.phone} · ${company.email}`]} nif={company.nif} niu={company.niu} rccm={company.rccm} muted />
        <PartyBlock title="Client" accent={ACCENT} name={client?.name} lines={client ? [client.address, `${client.city}, ${client.country}`, `${client.contactName} · ${client.email}`] : undefined} nif={client?.nif} niu={client?.niu} rccm={client?.rccm} bordered />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-[#475569]">
        <span>Émission : <b className="text-[#0F172A]">{longDate(doc.issueDate)}</b></span>
        <span>Validité jusqu'au : <b className="text-[#0F172A]">{longDate(doc.dueDate)}</b></span>
        {doc.paymentTerms && <span>Paiement : <b className="text-[#0F172A]">{doc.paymentTerms}</b></span>}
      </div>

      <ItemsTable doc={doc} headerFrom={ACCENT} headerTo={ACCENT_TO} />

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="space-y-3">
          {(doc.executionTerms || doc.notes) && (
            <div className="rounded-lg bg-[#FFFBEB] p-3 ring-1 ring-[#FDE68A]">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#92400E]">Conditions de réalisation</div>
              <p className="mt-1 text-[10px] text-[#78350F]">{doc.executionTerms || doc.notes}</p>
            </div>
          )}
          <div className="rounded-lg border border-dashed border-[#F59E0B]/50 p-3 text-center">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#92400E]">Bon pour accord client</div>
            <div className="mt-4 text-[9px] text-[#B45309]">Date & signature</div>
            <div className="mt-6 mx-auto h-10 w-40 border-b border-[#D97706]/40" />
          </div>
          <StampBox accent={ACCENT} label="Cachet du cabinet" />
        </div>
        <div className="ml-auto w-full max-w-xs">
          <div className="overflow-hidden rounded-lg ring-1 ring-[#FDE68A]">
            <AmountRow label="Sous-total HT" value={number(doc.subtotal)} currency={doc.currency} accent={ACCENT} />
            <AmountRow label="TVA (18 %)" value={number(doc.vat)} currency={doc.currency} accent={ACCENT} />
            <AmountRow label="Total TTC" value={number(doc.total)} currency={doc.currency} strong accent={ACCENT} />
          </div>
          <div className="mt-2 rounded-lg bg-[#FFFBEB] p-2 text-[9px] text-[#78350F]">
            <div><b>Modalités</b></div>
            <div>{doc.paymentTerms || "Acompte 40 % à la commande — solde à livraison."}</div>
            <div className="mt-1">{company.bankName} — {company.bankAccount}</div>
          </div>
        </div>
      </div>

      <LegalFooter {...company} />
    </PreviewShell>
  );
});
