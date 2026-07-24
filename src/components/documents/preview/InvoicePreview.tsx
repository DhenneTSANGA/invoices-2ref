import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { number, longDate } from "@/lib/format";
import { AmountRow, LegalFooter, PreviewLogo, PreviewShell, AmountInWords, PreviewBottomRow } from "./PreviewShell";

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
  const accent = "#1E40AF";

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
    <PreviewShell innerRef={ref} accent={accent} compact={compact} isThumb={isThumb} className={className}>
      <div className="flex items-start justify-between gap-4 border-b-2 pb-5" style={{ borderColor: accent }}>
        <div className="flex min-w-0 items-center gap-3">
          <PreviewLogo cabinet={doc.cabinet} />
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
          rccm={company.rccm}
          cnss={company.cnss}
          muted
        />
        <PartyBlock
          title="Client"
          accent={accent}
          name={client?.name}
          lines={clientLines}
          nif={client?.nif}
          niu={client?.niu}
          rccm={client?.rccm}
          bordered
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-[#475569]">
        <span>Date d'émission : <b className="text-[#0F172A]">{longDate(doc.issueDate)}</b></span>
        <span>Échéance : <b className="text-[#0F172A]">{longDate(doc.dueDate)}</b></span>
        {doc.paymentTerms && <span>Conditions : <b className="text-[#0F172A]">{doc.paymentTerms}</b></span>}
      </div>

      <ItemsTable doc={doc} headerFrom={accent} headerTo="#3B82F6" showTaxColumns={false} />

      <PreviewBottomRow
        left={
          <div>
            {doc.notes && (
              <div className="rounded-lg bg-[#F1F5F9] p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Notes</div>
                <p className="mt-1 text-[12px] text-[#334155]">{doc.notes}</p>
              </div>
            )}
            <StampBox accent={accent} />
          </div>
        }
        right={<TotalsBlock doc={doc} company={company} accent={accent} />}
      />

      <LegalFooter {...company} />
    </PreviewShell>
  );
});

function PartyBlock({
  title, accent, name, lines, nif, niu, rccm, cnss, muted, bordered,
}: {
  title: string;
  accent: string;
  name?: string;
  lines?: string[];
  nif?: string;
  niu?: string;
  rccm?: string;
  cnss?: string;
  muted?: boolean;
  bordered?: boolean;
}) {
  const ids = [
    nif && nif !== "—" ? { label: "NIF", value: nif } : null,
    niu && niu !== "—" ? { label: "NIU", value: niu } : null,
    rccm && rccm !== "—" ? { label: "RCCM", value: rccm } : null,
    cnss ? { label: "CNSS", value: cnss } : null,
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
                <span key={id.label} className={id.label === "RCCM" || id.label === "CNSS" ? "sm:col-span-2" : undefined}>
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

function ItemsTable({
  doc,
  headerFrom,
  headerTo,
  showTaxColumns = false,
}: {
  doc: Document;
  headerFrom: string;
  headerTo: string;
  showTaxColumns?: boolean;
}) {
  const colSpan = showTaxColumns ? 8 : 6;
  return (
    <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-[#E2E8F0]">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr style={{ background: `linear-gradient(90deg, ${headerFrom}, ${headerTo})` }} className="text-white">
            <th className="px-2.5 py-2.5 text-left font-semibold w-9">#</th>
            <th className="px-2.5 py-2.5 text-left font-semibold">Désignation</th>
            <th className="px-2.5 py-2.5 text-right font-semibold w-12">Qté</th>
            <th className="px-2.5 py-2.5 text-right font-semibold w-20">P.U. HT</th>
            {showTaxColumns && (
              <>
                <th className="px-2 py-2.5 text-right font-semibold w-12">TPS</th>
                <th className="px-2 py-2.5 text-right font-semibold w-12">CSS</th>
              </>
            )}
            <th className="px-2 py-2.5 text-right font-semibold w-12">TVA</th>
            <th className="px-2.5 py-2.5 text-right font-semibold w-24">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="px-3 py-6 text-center italic text-[#94A3B8]">
                Aucune ligne.
              </td>
            </tr>
          )}
          {doc.items.map((it, i) => {
            const lineTotal = it.quantity * it.unitPrice * (1 - (it.discount || 0) / 100);
            return (
              <tr key={it.id} className={i % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}>
                <td className="px-2.5 py-2.5 align-top text-[#64748B]">{String(i + 1).padStart(2, "0")}</td>
                <td className="px-2.5 py-2.5 align-top leading-snug">
                  {it.description}
                  {it.discount ? <span className="text-[#B45309]"> (−{it.discount}%)</span> : null}
                </td>
                <td className="px-2.5 py-2.5 text-right align-top font-mono">{it.quantity}</td>
                <td className="px-2.5 py-2.5 text-right align-top font-mono">{number(it.unitPrice)}</td>
                {showTaxColumns && (
                  <>
                    <td className="px-2 py-2.5 text-right align-top font-mono">{it.tpsRate ?? 0}%</td>
                    <td className="px-2 py-2.5 text-right align-top font-mono">{it.cssRate ?? 0}%</td>
                  </>
                )}
                <td className="px-2 py-2.5 text-right align-top font-mono">{it.vatRate}%</td>
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
    <div className="mt-3 rounded-lg border border-dashed border-[#CBD5E1] p-3.5 text-center">
      <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">{label}</div>
      <div className="mt-6 mx-auto flex h-16 w-36 items-center justify-center rounded-full border-2 border-dashed text-[11px] italic" style={{ borderColor: `${accent}66`, color: `${accent}99` }}>
        Cachet
      </div>
    </div>
  );
}

function TotalsBlock({ doc, company, accent }: { doc: Document; company: { bankName: string; bankAccount: string }; accent: string }) {
  return (
    <div className="w-full space-y-2">
      <div className="overflow-hidden rounded-lg ring-1 ring-[#E2E8F0]">
        <AmountRow label="Sous-total HT" value={number(doc.subtotal)} currency={doc.currency} accent={accent} />
        {(doc.tps ?? 0) > 0 && (
          <AmountRow label="TPS" value={number(doc.tps ?? 0)} currency={doc.currency} accent={accent} />
        )}
        {(doc.css ?? 0) > 0 && (
          <AmountRow label="CSS" value={number(doc.css ?? 0)} currency={doc.currency} accent={accent} />
        )}
        <AmountRow label="TVA (18 %)" value={number(doc.vat)} currency={doc.currency} accent={accent} />
        <AmountRow label="Total TTC" value={number(doc.total)} currency={doc.currency} strong accent={accent} />
      </div>
      <AmountInWords amount={doc.total} currency={doc.currency} accent={accent} />
      {(company.bankName || company.bankAccount) && (
        <div className="rounded-lg bg-[#F1F5F9] p-2.5 text-[11px] text-[#475569]">
          <div><b>Coordonnées bancaires</b></div>
          <div className="break-words">{[company.bankName, company.bankAccount].filter(Boolean).join(" — ")}</div>
        </div>
      )}
    </div>
  );
}

export { ItemsTable, PartyBlock, StampBox, TotalsBlock, partyAddressLines, partyContactLine };
