import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { longDate } from "@/lib/format";
import {
  LegalFooter,
  PreviewLogo,
  PreviewShell,
  AmountInWords,
  PreviewBottomRow,
} from "./PreviewShell";
import {
  ItemsTable,
  PartyBlock,
  TotalsBlock,
  partyAddressLines,
  partyContactLine,
} from "./InvoicePreview";
import { DOCUMENT_COLORS } from "@/lib/cabinets";
import {
  clientDisplayName,
  clientRepresentativeLine,
  formatClientBp,
} from "@/lib/client-address";
import { ManagerSignature } from "@/components/signature/ManagerSignature";
import { cn } from "@/lib/utils";

type Props = { doc: Document; compact?: boolean; variant?: "full" | "thumb"; className?: string };

const { accent: ACCENT, accentTo: ACCENT_TO } = DOCUMENT_COLORS.quotation;

export const QuotationPreview = forwardRef<HTMLDivElement, Props>(function QuotationPreview(
  { doc, compact, variant = "full", className },
  ref,
) {
  const { company, client } = usePreviewData(doc);
  const isThumb = variant === "thumb";
  /** Pas de densification : le PDF doit matcher l’aperçu écran. */
  const dense = false;
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
        formatClientBp(client.bp),
        [client.city, client.country].filter(Boolean).join(", "),
        partyContactLine([
          clientRepresentativeLine(client),
          client.email,
          client.phone,
        ]),
      ])
    : undefined;

  return (
    <PreviewShell innerRef={ref} accent={ACCENT} compact={compact} isThumb={isThumb} className={className}>
      <div
        className={cn(
          "flex items-start justify-between border-b-2",
          dense ? "gap-3 pb-2.5" : "gap-4 pb-5",
        )}
        style={{ borderColor: ACCENT }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <PreviewLogo cabinet={doc.cabinet} className="h-32" />
          <div className="min-w-0">
            <div
              className={cn(
                "font-display font-bold tracking-tight leading-tight",
                dense ? "text-base" : "text-xl",
              )}
              style={{ color: ACCENT }}
            >
              {company.name}
            </div>
            {company.tagline ? (
              <div className={cn("mt-0.5 leading-snug text-[#64748B]", dense ? "text-[10px]" : "text-[12px]")}>
                {company.tagline}
              </div>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={cn(
              "font-display font-bold uppercase tracking-wide",
              dense ? "text-[20px]" : "text-[28px]",
            )}
            style={{ color: ACCENT }}
          >
            Devis
          </div>
          <div className={cn("mt-0.5 font-semibold", dense ? "text-[11px]" : "text-[13px]")}>
            N° {doc.number}
          </div>
          <div className={cn("text-[#64748B]", dense ? "text-[10px]" : "text-[12px]")}>
            {longDate(doc.issueDate)}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl font-medium",
          dense ? "mt-2 px-2.5 py-1.5 text-[10px]" : "mt-4 px-3.5 py-2.5 text-[12px]",
        )}
        style={{
          color: ACCENT,
          background: `${ACCENT_TO}22`,
          border: `1px solid ${ACCENT_TO}88`,
        }}
      >
        Proposition commerciale valable <b>{validity} jours</b> à compter de la date d'émission — acceptation écrite requise (OHADA / Gabon).
      </div>

      <table
        className={cn(dense ? "mt-2" : "mt-4")}
        style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
      >
        <tbody>
          <tr>
            <td style={{ width: "50%", verticalAlign: "top", paddingRight: "12px" }}>
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
                compact={dense}
              />
            </td>
            <td style={{ width: "50%", verticalAlign: "top", paddingLeft: "12px" }}>
              <PartyBlock
                title="Client"
                accent={ACCENT}
                name={client ? clientDisplayName(client) : undefined}
                lines={clientLines}
                nif={client?.nif}
                niu={client?.niu}
                rccm={client?.rccm}
                cnss={client?.cnss}
                cnamgs={client?.cnamgs}
                bordered
                compact={dense}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div
        className={cn(
          "flex flex-wrap text-[#475569]",
          dense ? "mt-2 gap-x-5 gap-y-0.5 text-[10px]" : "mt-4 gap-x-6 gap-y-1 text-[12px]",
        )}
      >
        <span>Émission : <b className="text-[#0F172A]">{longDate(doc.issueDate)}</b></span>
        <span>Validité jusqu'au : <b className="text-[#0F172A]">{longDate(doc.dueDate)}</b></span>
      </div>

      <ItemsTable doc={doc} headerFrom={ACCENT} headerTo={ACCENT_TO} compact={dense} />

      <PreviewBottomRow
        compact={dense}
        left={
          doc.executionTerms || doc.notes ? (
            <div
              className={cn("rounded-lg", dense ? "p-2.5" : "p-3.5")}
              style={{
                background: `${ACCENT_TO}18`,
                boxShadow: `inset 0 0 0 1px ${ACCENT_TO}88`,
              }}
            >
              <div
                className={cn(
                  "font-bold uppercase tracking-wider",
                  dense ? "text-[9px]" : "text-[11px]",
                )}
                style={{ color: ACCENT }}
              >
                Conditions de réalisation
              </div>
              <p className={cn("text-[#334155]", dense ? "mt-0.5 text-[10px]" : "mt-1 text-[12px]")}>
                {doc.executionTerms || doc.notes}
              </p>
            </div>
          ) : (
            <div />
          )
        }
        right={<TotalsBlock doc={doc} accent={ACCENT} compact={dense} />}
      />

      <div className={cn("w-full", dense ? "mt-2" : "mt-4")}>
        <AmountInWords amount={doc.total} currency={doc.currency} accent={ACCENT} compact={dense} />
      </div>

      <div className={cn("flex justify-end", dense ? "mt-2" : "mt-4")}>
        <ManagerSignature
          applied={doc.status === "signed" || doc.status === "sent" || doc.status === "accepted"}
          managerName={company.managerName?.trim() || ""}
          signatureUrl={company.stampUrl?.trim() || ""}
          signatoryTitle="Le Gérant"
          accent={ACCENT}
          compact={dense}
        />
      </div>

      <LegalFooter {...company} niuLabel={doc.cabinet === "conseil" ? "STAT" : "NIU"} compact={dense} />
    </PreviewShell>
  );
});
