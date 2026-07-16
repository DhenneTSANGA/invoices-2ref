import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { number, longDate } from "@/lib/format";
import { AmountRow, LegalFooter, PreviewLogo, PreviewShell } from "./PreviewShell";

type Props = { doc: Document; compact?: boolean; variant?: "full" | "thumb"; className?: string };

export const InvoicePreview = forwardRef<HTMLDivElement, Props>(function InvoicePreview(
  { doc, compact, variant = "full", className },
  ref,
) {
  const company = useAppStore((s) => s.company);
  const client = useAppStore((s) => s.clients.find((c) => c.id === doc.clientId));
  const isThumb = variant === "thumb";
  const accent = "#1E40AF";

  return (
    <PreviewShell innerRef={ref} accent={accent} compact={compact} isThumb={isThumb} className={className}>
      <div className="flex items-start justify-between border-b-2 pb-5" style={{ borderColor: accent }}>
        <div className="flex items-center gap-3">
          <PreviewLogo />
          <div>
            <div className="font-display text-lg font-bold tracking-tight" style={{ color: accent }}>{company.name}</div>
            <div className="text-[10px] text-[#64748B]">{company.tagline}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-[26px] font-bold uppercase tracking-wide" style={{ color: accent }}>FACTURE</div>
          <div className="mt-1 text-[11px] font-semibold">N° {doc.number}</div>
          <div className="text-[10px] text-[#64748B]">{longDate(doc.issueDate)}</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-6">
        <PartyBlock title="Émetteur" accent="#64748B" name={company.name} lines={[company.address, company.city, `${company.phone} · ${company.email}`]} nif={company.nif} niu={company.niu} rccm={company.rccm} muted />
        <PartyBlock title="Client" accent={accent} name={client?.name} lines={client ? [client.address, `${client.city}, ${client.country}`, `${client.contactName} · ${client.email}`] : undefined} nif={client?.nif} niu={client?.niu} rccm={client?.rccm} bordered />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-[#475569]">
        <span>Date d'émission : <b className="text-[#0F172A]">{longDate(doc.issueDate)}</b></span>
        <span>Échéance : <b className="text-[#0F172A]">{longDate(doc.dueDate)}</b></span>
        {doc.paymentTerms && <span>Conditions : <b className="text-[#0F172A]">{doc.paymentTerms}</b></span>}
      </div>

      <ItemsTable doc={doc} headerFrom={accent} headerTo="#3B82F6" />

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          {doc.notes && (
            <div className="rounded-lg bg-[#F1F5F9] p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">Notes</div>
              <p className="mt-1 text-[10px] text-[#334155]">{doc.notes}</p>
            </div>
          )}
          <StampBox accent={accent} />
        </div>
        <TotalsBlock doc={doc} company={company} accent={accent} />
      </div>

      <LegalFooter {...company} />
    </PreviewShell>
  );
});

function PartyBlock({
  title, accent, name, lines, nif, niu, rccm, muted, bordered,
}: {
  title: string; accent: string; name?: string; lines?: string[]; nif?: string; niu?: string; rccm?: string; muted?: boolean; bordered?: boolean;
}) {
  return (
    <div className={muted ? "rounded-lg bg-[#F1F5F9] p-3" : bordered ? "rounded-lg border-2 p-3" : "rounded-lg p-3"} style={bordered ? { borderColor: `${accent}33` } : undefined}>
      <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: accent }}>{title}</div>
      {name ? (
        <>
          <div className="mt-1 text-[11px] font-semibold">{name}</div>
          {lines?.map((l, i) => <div key={i} className="text-[10px] text-[#475569]">{l}</div>)}
          <div className="mt-1 grid grid-cols-2 gap-x-2 text-[9px] text-[#475569]">
            {nif && <span>NIF: <b className="text-[#0F172A]">{nif}</b></span>}
            {niu && <span>NIU: <b className="text-[#0F172A]">{niu}</b></span>}
            {rccm && <span className="col-span-2">RCCM: <b className="text-[#0F172A]">{rccm}</b></span>}
          </div>
        </>
      ) : (
        <div className="mt-2 text-[10px] italic text-[#94A3B8]">Sélectionnez un client…</div>
      )}
    </div>
  );
}

function ItemsTable({ doc, headerFrom, headerTo }: { doc: Document; headerFrom: string; headerTo: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-[#E2E8F0]">
      <table className="w-full border-collapse text-[10.5px]">
        <thead>
          <tr style={{ background: `linear-gradient(90deg, ${headerFrom}, ${headerTo})` }} className="text-white">
            <th className="px-3 py-2 text-left font-semibold w-10">#</th>
            <th className="px-3 py-2 text-left font-semibold">Désignation</th>
            <th className="px-3 py-2 text-right font-semibold w-16">Qté</th>
            <th className="px-3 py-2 text-right font-semibold w-24">P.U. HT</th>
            <th className="px-3 py-2 text-right font-semibold w-14">TVA</th>
            <th className="px-3 py-2 text-right font-semibold w-28">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-6 text-center italic text-[#94A3B8]">Aucune ligne.</td></tr>
          )}
          {doc.items.map((it, i) => {
            const lineTotal = it.quantity * it.unitPrice * (1 - (it.discount || 0) / 100);
            return (
              <tr key={it.id} className={i % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}>
                <td className="px-3 py-2 align-top text-[#64748B]">{String(i + 1).padStart(2, "0")}</td>
                <td className="px-3 py-2 align-top">{it.description}{it.discount ? <span className="text-[#B45309]"> (−{it.discount}%)</span> : null}</td>
                <td className="px-3 py-2 text-right align-top font-mono">{it.quantity}</td>
                <td className="px-3 py-2 text-right align-top font-mono">{number(it.unitPrice)}</td>
                <td className="px-3 py-2 text-right align-top font-mono">{it.vatRate}%</td>
                <td className="px-3 py-2 text-right align-top font-mono font-semibold">{number(lineTotal)}</td>
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
    <div className="mt-3 rounded-lg border border-dashed border-[#CBD5E1] p-3 text-center">
      <div className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">{label}</div>
      <div className="mt-6 mx-auto flex h-14 w-32 items-center justify-center rounded-full border-2 border-dashed text-[9px] italic" style={{ borderColor: `${accent}66`, color: `${accent}99` }}>
        Cachet
      </div>
    </div>
  );
}

function TotalsBlock({ doc, company, accent }: { doc: Document; company: { bankName: string; bankAccount: string }; accent: string }) {
  return (
    <div className="ml-auto w-full max-w-xs">
      <div className="overflow-hidden rounded-lg ring-1 ring-[#E2E8F0]">
        <AmountRow label="Sous-total HT" value={number(doc.subtotal)} currency={doc.currency} accent={accent} />
        <AmountRow label="TVA (18 %)" value={number(doc.vat)} currency={doc.currency} accent={accent} />
        <AmountRow label="Total TTC" value={number(doc.total)} currency={doc.currency} strong accent={accent} />
      </div>
      <div className="mt-2 rounded-lg bg-[#F1F5F9] p-2 text-[9px] text-[#475569]">
        <div><b>Coordonnées bancaires</b></div>
        <div>{company.bankName} — Compte {company.bankAccount}</div>
      </div>
    </div>
  );
}

export { ItemsTable, PartyBlock, StampBox, TotalsBlock };
