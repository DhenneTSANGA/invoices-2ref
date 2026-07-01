import type { Document } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { number, longDate } from "@/lib/format";

const typeLabel = (t: Document["type"]) => t === "invoice" ? "FACTURE" : t === "quotation" ? "DEVIS" : "FACTURE PROFORMA";

export function DocumentPreview({ doc, compact = false }: { doc: Document; compact?: boolean }) {
  const company = useAppStore((s) => s.company);
  const client = useAppStore((s) => s.clients.find((c) => c.id === doc.clientId));

  return (
    <div className={`mx-auto bg-white text-[#0F172A] shadow-float ${compact ? "" : "aspect-[1/1.414]"} w-full max-w-[820px] overflow-hidden rounded-2xl ring-1 ring-black/5`}>
      <div className="flex h-full flex-col p-8 text-[12px] leading-relaxed">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-[#1E40AF] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] text-white font-display text-2xl font-bold shadow">F</div>
            <div>
              <div className="font-display text-lg font-bold tracking-tight text-[#1E40AF]">{company.name}</div>
              <div className="text-[10px] text-[#64748B]">{company.tagline}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-[26px] font-bold uppercase tracking-wide text-[#1E40AF]">{typeLabel(doc.type)}</div>
            <div className="mt-1 text-[11px] font-semibold text-[#0F172A]">N° {doc.number}</div>
            <div className="text-[10px] text-[#64748B]">{longDate(doc.issueDate)}</div>
          </div>
        </div>

        {/* Parties */}
        <div className="mt-5 grid grid-cols-2 gap-6">
          <div className="rounded-lg bg-[#F1F5F9] p-3">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">Émetteur</div>
            <div className="mt-1 text-[11px] font-semibold">{company.name}</div>
            <div className="text-[10px] text-[#475569]">{company.address}<br/>{company.city}</div>
            <div className="mt-1 text-[10px] text-[#475569]">{company.phone} · {company.email}</div>
            <div className="mt-1 grid grid-cols-2 gap-x-2 text-[9px] text-[#475569]">
              <span>ICE: <b className="text-[#0F172A]">{company.ice}</b></span>
              <span>IF: <b className="text-[#0F172A]">{company.if}</b></span>
              <span>RC: <b className="text-[#0F172A]">{company.rc}</b></span>
              <span>Patente: <b className="text-[#0F172A]">{company.patente}</b></span>
            </div>
          </div>
          <div className="rounded-lg border-2 border-[#1E40AF]/20 p-3">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#1E40AF]">Client</div>
            {client ? (
              <>
                <div className="mt-1 text-[11px] font-semibold">{client.name}</div>
                <div className="text-[10px] text-[#475569]">{client.address}<br/>{client.city}, {client.country}</div>
                <div className="mt-1 text-[10px] text-[#475569]">{client.contactName} · {client.email}</div>
                <div className="mt-1 grid grid-cols-2 gap-x-2 text-[9px] text-[#475569]">
                  <span>ICE: <b className="text-[#0F172A]">{client.ice}</b></span>
                  <span>IF: <b className="text-[#0F172A]">{client.if}</b></span>
                  <span>RC: <b className="text-[#0F172A]">{client.rc}</b></span>
                </div>
              </>
            ) : (
              <div className="mt-2 text-[10px] italic text-[#94A3B8]">Sélectionnez un client…</div>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-[#475569]">
          <span>Date d'émission : <b className="text-[#0F172A]">{longDate(doc.issueDate)}</b></span>
          <span>Échéance : <b className="text-[#0F172A]">{longDate(doc.dueDate)}</b></span>
          {doc.paymentTerms && <span>Conditions : <b className="text-[#0F172A]">{doc.paymentTerms}</b></span>}
        </div>

        {/* Items */}
        <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-[#E2E8F0]">
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] text-white">
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
                <tr><td colSpan={6} className="px-3 py-6 text-center italic text-[#94A3B8]">Aucune ligne — ajoutez des services à gauche.</td></tr>
              )}
              {doc.items.map((it, i) => {
                const lineTotal = it.quantity * it.unitPrice * (1 - (it.discount || 0) / 100);
                return (
                  <tr key={it.id} className={i % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}>
                    <td className="px-3 py-2 align-top text-[#64748B]">{String(i + 1).padStart(2, "0")}</td>
                    <td className="px-3 py-2 align-top">{it.description}</td>
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

        {/* Totals + signature */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            {doc.notes && (
              <div className="rounded-lg bg-[#F1F5F9] p-3">
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">Notes</div>
                <p className="mt-1 text-[10px] text-[#334155]">{doc.notes}</p>
              </div>
            )}
            <div className="mt-3 rounded-lg border border-dashed border-[#CBD5E1] p-3 text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">Signature & Cachet</div>
              <div className="mt-6 mx-auto h-14 w-32 rounded-full border-2 border-dashed border-[#1E40AF]/40 text-[9px] flex items-center justify-center text-[#1E40AF]/60 italic">Cachet</div>
            </div>
          </div>
          <div className="ml-auto w-full max-w-xs">
            <div className="overflow-hidden rounded-lg ring-1 ring-[#E2E8F0]">
              <Row label="Sous-total HT" value={number(doc.subtotal)} currency={doc.currency} />
              <Row label="TVA" value={number(doc.vat)} currency={doc.currency} />
              <Row label="Total TTC" value={number(doc.total)} currency={doc.currency} strong />
            </div>
            <div className="mt-2 rounded-lg bg-[#F1F5F9] p-2 text-[9px] text-[#475569]">
              <div><b>Coordonnées bancaires</b></div>
              <div>{company.bankName} — RIB {company.bankRib}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-[#E2E8F0] pt-3 text-center text-[9px] text-[#64748B]">
          {company.name} — {company.address}, {company.city} · ICE {company.ice} · IF {company.if} · RC {company.rc} · CNSS {company.cnss}<br/>
          {company.phone} · {company.email} · {company.website}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, currency, strong }: { label: string; value: string; currency: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 text-[11px] ${strong ? "bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] text-white" : "bg-white"}`}>
      <span className={strong ? "font-bold uppercase tracking-wide" : "text-[#475569]"}>{label}</span>
      <span className={`font-mono ${strong ? "font-bold" : "font-semibold text-[#0F172A]"}`}>{value} {currency}</span>
    </div>
  );
}
