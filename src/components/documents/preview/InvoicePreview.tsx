import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { number, longDate } from "@/lib/format";
import {
  AmountRow,
  LegalFooter,
  PreviewLogo,
  PreviewShell,
  AmountInWords,
  PreviewBottomRow,
} from "./PreviewShell";
import { computeDocumentTotals, documentTaxRates } from "@/lib/document-math";
import { DOCUMENT_COLORS } from "@/lib/cabinets";
import { ManagerSignature } from "@/components/signature/ManagerSignature";
import {
  clientDisplayName,
  clientRepresentativeLine,
} from "@/lib/client-address";

type Props = { doc: Document; compact?: boolean; variant?: "full" | "thumb"; className?: string };

function partyContactLine(parts: Array<string | undefined | null>) {
  return parts.map((p) => p?.trim()).filter(Boolean).join(" · ");
}

function partyAddressLines(parts: Array<string | undefined | null>) {
  return parts.map((p) => p?.trim()).filter((p): p is string => Boolean(p));
}

export const InvoicePreview = forwardRef<HTMLDivElement, Props>(function InvoicePreview(
  { doc, compact, variant = "full", className },
  ref,
) {
  const { company, client } = usePreviewData(doc);
  const isThumb = variant === "thumb";
  const { accent, accentTo } = DOCUMENT_COLORS.invoice;

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
        partyContactLine([
          clientRepresentativeLine(client),
          client.email,
          client.phone,
        ]),
      ])
    : undefined;

  return (
    <PreviewShell innerRef={ref} accent={accent} compact={compact} isThumb={isThumb} className={className}>
      <div className="flex items-start justify-between gap-4 border-b-2 pb-5" style={{ borderColor: accent }}>
        <div className="flex min-w-0 items-center gap-3">
          <PreviewLogo cabinet={doc.cabinet} className="h-32" />
          <div className="min-w-0">
            <div className="font-display text-xl font-bold tracking-tight leading-tight" style={{ color: accent }}>
              {company.name}
            </div>
            {company.tagline ? (
              <div className="mt-0.5 text-[12px] leading-snug text-[#64748B]">{company.tagline}</div>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-[30px] font-bold uppercase tracking-wide" style={{ color: accent }}>FACTURE</div>
          <div className="mt-1 text-[13px] font-semibold">N° {doc.number}</div>
          <div className="text-[12px] text-[#64748B]">{longDate(doc.issueDate)}</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-6">
        <PartyBlock
          title="Émetteur"
          accent="#64748B"
          name={company.name}
          lines={emitterLines}
          nif={company.nif}
          niu={company.niu}
          niuLabel={doc.cabinet === "conseil" ? "STAT" : "NIU"}
          rccm={company.rccm}
          cnss={company.cnss}
          muted
        />
        <PartyBlock
          title="Client"
          accent={accent}
          name={client ? clientDisplayName(client) : undefined}
          lines={clientLines}
          nif={client?.nif}
          niu={client?.niu}
          rccm={client?.rccm}
          cnss={client?.cnss}
          cnamgs={client?.cnamgs}
          bordered
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-[#475569]">
        <span>Date d'émission : <b className="text-[#0F172A]">{longDate(doc.issueDate)}</b></span>
        <span>Échéance : <b className="text-[#0F172A]">{longDate(doc.dueDate)}</b></span>
        {doc.paymentTerms && <span>Conditions : <b className="text-[#0F172A]">{doc.paymentTerms}</b></span>}
      </div>

      <ItemsTable doc={doc} headerFrom={accent} headerTo={accentTo} />

      <PreviewBottomRow
        left={
          company.bankName || company.bankAccount ? (
            <div className="rounded-lg bg-[#F1F5F9] p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                RIB pour le règlement
              </div>
              {company.bankName ? (
                <div className="mt-1 text-[12px] text-[#334155]">
                  <span className="text-[#64748B]">Banque : </span>
                  {company.bankName}
                </div>
              ) : null}
              {company.bankAccount ? (
                <div className="mt-0.5 break-words text-[12px] text-[#334155]">
                  <span className="text-[#64748B]">RIB : </span>
                  {company.bankAccount}
                </div>
              ) : null}
            </div>
          ) : (
            <div />
          )
        }
        right={<TotalsBlock doc={doc} accent={accent} />}
      />

      <div className="mt-4 w-full">
        <AmountInWords amount={doc.total} currency={doc.currency} accent={accent} />
      </div>

      <div className="mt-4 flex justify-end">
        <ManagerSignature
          applied={doc.status === "signed" || doc.status === "sent" || doc.status === "paid"}
          managerName={company.managerName?.trim() || ""}
          signatureUrl={company.stampUrl?.trim() || ""}
          signatoryTitle="Le Gérant"
          accent={accent}
        />
      </div>

      <LegalFooter {...company} niuLabel={doc.cabinet === "conseil" ? "STAT" : "NIU"} />
    </PreviewShell>
  );
});

function PartyBlock({
  title, accent, name, lines, nif, niu, niuLabel = "NIU", rccm, cnss, cnamgs, muted, bordered,
}: {
  title: string;
  accent: string;
  name?: string;
  lines?: string[];
  nif?: string;
  niu?: string;
  niuLabel?: string;
  rccm?: string;
  cnss?: string;
  cnamgs?: string;
  muted?: boolean;
  bordered?: boolean;
}) {
  const ids = [
    nif && nif !== "—" ? { label: "NIF", value: nif } : null,
    niu && niu !== "—" ? { label: niuLabel, value: niu } : null,
    rccm && rccm !== "—" ? { label: "RCCM", value: rccm } : null,
    cnss ? { label: "CNSS", value: cnss } : null,
    cnamgs ? { label: "CNAMGS", value: cnamgs } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div
      className={
        muted
          ? "rounded-lg bg-[#F1F5F9] p-3.5"
          : bordered
            ? "rounded-lg border-2 p-3.5"
            : "rounded-lg p-3.5"
      }
      style={bordered ? { borderColor: `${accent}33` } : undefined}
    >
      <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: accent }}>{title}</div>
      {name ? (
        <>
          <div className="mt-1.5 text-[14px] font-semibold leading-snug break-words">{name}</div>
          {lines?.map((l, i) => (
            <div key={i} className="text-[12px] leading-snug text-[#475569] break-words">{l}</div>
          ))}
          {ids.length > 0 && (
            <div className="mt-1.5 grid grid-cols-1 gap-y-0.5 text-[11px] text-[#475569] sm:grid-cols-2 sm:gap-x-2">
              {ids.map((id) => (
                <span
                  key={id.label}
                  className={
                    id.label === "RCCM" || id.label === "CNSS" || id.label === "CNAMGS"
                      ? "sm:col-span-2"
                      : undefined
                  }
                >
                  {id.label}: <b className="text-[#0F172A]">{id.value}</b>
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mt-2 text-[12px] italic text-[#94A3B8]">Sélectionnez un client…</div>
      )}
    </div>
  );
}

/** Tableau de lignes — sans CSS/TVA (affichés uniquement dans le bloc totaux). */
function ItemsTable({
  doc,
  headerFrom,
  headerTo,
}: {
  doc: Document;
  headerFrom: string;
  headerTo: string;
  /** @deprecated Ignoré — taxes uniquement dans les totaux. */
  showTaxColumns?: boolean;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-[#E2E8F0]">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr style={{ background: `linear-gradient(90deg, ${headerFrom}, ${headerTo})` }} className="text-white">
            <th className="px-2.5 py-2.5 text-left font-semibold w-9">#</th>
            <th className="px-2.5 py-2.5 text-left font-semibold">Désignation</th>
            <th className="px-2.5 py-2.5 text-right font-semibold w-12">Qté</th>
            <th className="px-2.5 py-2.5 text-right font-semibold w-20">P.U. HT</th>
            <th className="px-2.5 py-2.5 text-right font-semibold w-24">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center italic text-[#94A3B8]">
                Aucune ligne.
              </td>
            </tr>
          )}
          {doc.items.map((it, i) => {
            const lineTotal = it.quantity * it.unitPrice;
            return (
              <tr key={it.id} className={i % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}>
                <td className="px-2.5 py-2.5 align-top text-[#64748B]">{String(i + 1).padStart(2, "0")}</td>
                <td className="px-2.5 py-2.5 align-top leading-snug">
                  {it.description}
                </td>
                <td className="px-2.5 py-2.5 text-right align-top font-mono">{it.quantity}</td>
                <td className="px-2.5 py-2.5 text-right align-top font-mono">{number(it.unitPrice)}</td>
                <td className="px-2.5 py-2.5 text-right align-top font-mono font-semibold">{number(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StampBox({ accent, label = "Signature & Cachet" }: { accent: string; label?: string }) {
  return (
    <div className="w-full max-w-[300px] rounded-xl border-2 border-dashed border-[#CBD5E1] px-5 py-5 text-center">
      <div className="text-[13px] font-bold uppercase tracking-wider text-[#64748B]">{label}</div>
      <div
        className="mx-auto mt-8 flex h-28 w-52 items-center justify-center rounded-full border-2 border-dashed text-[13px] italic"
        style={{ borderColor: `${accent}66`, color: `${accent}99` }}
      >
        Cachet
      </div>
    </div>
  );
}

function TotalsBlock({
  doc,
  accent,
}: {
  doc: Document;
  accent: string;
}) {
  const { vatRate, cssRate } = documentTaxRates(doc.items);
  const discountPct = doc.discount ?? 0;
  const computed = computeDocumentTotals(doc.items, {
    discount: discountPct,
    vatRate,
    cssRate,
  });
  const grossSubtotal = computed.grossSubtotal || doc.subtotal;
  const discountAmount = computed.discountAmount;
  const subtotal = doc.subtotal || computed.subtotal;
  const css = doc.css ?? computed.css;
  const vat = doc.vat || computed.vat;
  const total = doc.total || computed.total;

  return (
    <div className="w-full space-y-2">
      <div className="overflow-hidden rounded-lg ring-1 ring-[#E2E8F0]">
        <AmountRow
          label="Sous-total HT"
          value={number(grossSubtotal)}
          currency={doc.currency}
          accent={accent}
        />
        {discountAmount > 0 ? (
          <AmountRow
            label={`Remise (${discountPct} %)`}
            value={number(-discountAmount)}
            currency={doc.currency}
            accent={accent}
          />
        ) : null}
        {discountAmount > 0 ? (
          <AmountRow
            label="HT net"
            value={number(subtotal)}
            currency={doc.currency}
            accent={accent}
          />
        ) : null}
        <AmountRow
          label={`CSS (${cssRate} %)`}
          value={number(css)}
          currency={doc.currency}
          accent={accent}
        />
        <AmountRow
          label={`TVA (${vatRate} %)`}
          value={number(vat)}
          currency={doc.currency}
          accent={accent}
        />
        <AmountRow
          label="Total TTC"
          value={number(total)}
          currency={doc.currency}
          strong
          accent={accent}
        />
      </div>
    </div>
  );
}

export { ItemsTable, PartyBlock, StampBox, TotalsBlock, partyAddressLines, partyContactLine };
