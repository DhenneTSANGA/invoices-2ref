import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { longDate } from "@/lib/format";
import {
  DOC_SHELL,
  DOC_TEXT,
  LegalFooter,
  PreviewLogo,
  PreviewShell,
  AmountInWords,
  DocumentClientRef,
  PreviewBottomRow,
} from "./PreviewShell";
import {
  HEADER_LOGO_HEIGHT,
  InfoPanel,
  ItemsTable,
  PartyBlock,
  TotalsBlock,
  TWO_COL,
  partyAddressLines,
  partyContactLine,
} from "./InvoicePreview";
import { COMPANY_DEFAULTS, DOCUMENT_COLORS, niuLabelForCabinet } from "@/lib/cabinets";
import { clientDocumentLines } from "@/lib/client-address";
import { ManagerSignature } from "@/components/signature/ManagerSignature";
import { cn } from "@/lib/utils";
import {
  isAccountantSignatory,
  signatoryDisplayName,
} from "@/lib/signatory";

type Props = {
  doc: Document;
  compact?: boolean;
  variant?: "full" | "thumb";
  className?: string;
  omitSignature?: boolean;
};

const { accent: ACCENT, accentTo: ACCENT_TO } = DOCUMENT_COLORS.quotation;
/** Équivalent vert des fonds clairs de la facture papier. */
const TINT = "#E5EFDB";

export const QuotationPreview = forwardRef<HTMLDivElement, Props>(function QuotationPreview(
  { doc, compact, variant = "full", className, omitSignature },
  ref,
) {
  const { company, client } = usePreviewData(doc);
  const isThumb = variant === "thumb";
  /** Pas de densification : le PDF doit matcher l’aperçu écran. */
  const dense = false;
  const validity = doc.validityDays ?? 30;
  /** Design papier 2R Conseil — aligné sur la facture, en vert. */
  const isConseilDesign = doc.cabinet === "conseil";

  const niuLabel = niuLabelForCabinet(doc.cabinet);
  const accountantSignatory = isAccountantSignatory(doc.signatoryTitle);
  const signatoryName = signatoryDisplayName(doc.signatoryTitle);

  const emitterLines = partyAddressLines([
    company.address,
    company.city,
    partyContactLine([company.phone, company.email]),
    company.website,
  ]);

  const clientLines = client ? clientDocumentLines(client) : undefined;

  const validityNote = (
    <>
      Proposition commerciale valable <b>{validity} jours</b> à compter de la date
      d&apos;émission — acceptation écrite requise (OHADA / Gabon).
    </>
  );

  /* En design papier, capital / NIF / RCCM restent dans le pied de page légal. */
  const emitterBlock = (
    <PartyBlock
      title={isConseilDesign ? "" : "Émetteur"}
      accent={isConseilDesign ? ACCENT : "#64748B"}
      name={company.name}
      lines={emitterLines}
      capital={
        isConseilDesign
          ? undefined
          : company.capital || COMPANY_DEFAULTS[doc.cabinet]?.capital
      }
      nif={isConseilDesign ? undefined : company.nif}
      niu={company.niu}
      niuLabel={niuLabel}
      rccm={isConseilDesign ? undefined : company.rccm}
      referenceDesign={isConseilDesign}
      muted={!isConseilDesign}
      compact={dense}
    />
  );

  const clientBlock = (
    <PartyBlock
      title={isConseilDesign ? "Nom du client" : "Client"}
      accent={isConseilDesign ? ACCENT : "#64748B"}
      name={client?.name?.trim() || undefined}
      lines={clientLines}
      nif={client?.nif}
      niu={client?.niu}
      rccm={client?.rccm}
      referenceDesign={isConseilDesign}
      muted={!isConseilDesign}
      compact={dense}
    />
  );

  return (
    <PreviewShell
      innerRef={ref}
      accent={ACCENT}
      compact={compact}
      isThumb={isThumb}
      className={className}
      {...DOC_SHELL}
    >
      {isConseilDesign ? (
        <>
          {/* Ligne juste sous logo + titre DEVIS — méta et parties en dessous. */}
          <div className="border-b pb-2.5" style={{ borderColor: "#475569" }}>
            <table style={TWO_COL.table}>
              <tbody>
                <tr>
                  <td style={TWO_COL.left}>
                    <PreviewLogo cabinet={doc.cabinet} artworkHeight={HEADER_LOGO_HEIGHT} />
                  </td>
                  <td style={{ ...TWO_COL.right, textAlign: "right", verticalAlign: "middle" }}>
                    <div
                      className="font-serif font-bold uppercase leading-none tracking-wide text-[34px]"
                      style={{ color: ACCENT }}
                    >
                      DEVIS
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <table className="mt-3" style={TWO_COL.table}>
            <tbody>
              <tr>
                <td style={TWO_COL.left}>
                  {emitterBlock}
                  <div className="mt-3">{clientBlock}</div>
                </td>
                <td style={{ ...TWO_COL.right, textAlign: "right" }}>
                  <div className={cn("space-y-0.5", DOC_TEXT.small)}>
                    <div>
                      <span className="text-[#64748B]">N° de devis : </span>
                      <span className={cn("font-semibold text-[#0F172A]", DOC_TEXT.base)}>
                        {doc.number}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Date : </span>
                      <span className={cn("font-semibold text-[#0F172A]", DOC_TEXT.base)}>
                        {longDate(doc.issueDate)}
                      </span>
                    </div>
                    <DocumentClientRef clientRef={client?.clientRef} />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div
            className={cn("mt-3 px-3 py-2 text-center font-medium", DOC_TEXT.small)}
            style={{ background: TINT, color: ACCENT }}
          >
            {validityNote}
          </div>
        </>
      ) : (
        <>
          <div
            className="flex items-center justify-between gap-4 border-b-2 pb-5"
            style={{ borderColor: ACCENT }}
          >
            <div className="shrink-0">
              <PreviewLogo cabinet={doc.cabinet} className="h-40" />
            </div>
            <div className="shrink-0 text-right">
              <div
                className="font-display font-bold uppercase tracking-wide text-[28px]"
                style={{ color: ACCENT }}
              >
                Devis
              </div>
              <div className={cn("mt-0.5 font-semibold", DOC_TEXT.base)}>N° {doc.number}</div>
              <div className={cn("text-[#64748B]", DOC_TEXT.small)}>{longDate(doc.issueDate)}</div>
              <DocumentClientRef clientRef={client?.clientRef} />
            </div>
          </div>

          <div
            className={cn("mt-4 rounded-xl px-3.5 py-2.5 font-medium", DOC_TEXT.small)}
            style={{
              color: ACCENT,
              background: `${ACCENT_TO}22`,
              border: `1px solid ${ACCENT_TO}88`,
            }}
          >
            {validityNote}
          </div>

          <table className="mt-4" style={TWO_COL.table}>
            <tbody>
              <tr>
                <td style={TWO_COL.left}>{emitterBlock}</td>
                <td style={TWO_COL.right}>{clientBlock}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {doc.dueDate?.trim() ? (
        <div className={cn("mt-2.5 text-[#475569]", DOC_TEXT.small)}>
          Date d&apos;échéance :{" "}
          <b className={cn("text-[#0F172A]", DOC_TEXT.base)}>{longDate(doc.dueDate)}</b>
        </div>
      ) : null}

      <ItemsTable
        doc={doc}
        accent={ACCENT}
        headerFrom={ACCENT}
        headerTo={ACCENT_TO}
        compact={dense}
        referenceDesign={isConseilDesign}
        sectionTint={TINT}
      />

      <PreviewBottomRow
        compact={dense}
        left={
          doc.paymentTerms?.trim() || doc.executionTerms?.trim() ? (
            <div className={cn("space-y-2", dense ? "space-y-1.5" : "space-y-2")}>
              {doc.paymentTerms?.trim() ? (
                <TermsPanel
                  title="Modalité de paiement"
                  referenceDesign={isConseilDesign}
                  compact={dense}
                >
                  {doc.paymentTerms.trim()}
                </TermsPanel>
              ) : null}
              {doc.executionTerms?.trim() ? (
                <TermsPanel
                  title="Conditions de réalisation"
                  referenceDesign={isConseilDesign}
                  compact={dense}
                >
                  {doc.executionTerms.trim()}
                </TermsPanel>
              ) : null}
            </div>
          ) : (
            <div />
          )
        }
        right={
          <TotalsBlock
            doc={doc}
            accent={ACCENT}
            compact={dense}
            referenceDesign={isConseilDesign}
            tint={TINT}
          />
        }
      />

      <div className={cn("w-full", dense ? "mt-2" : isConseilDesign ? "mt-2.5" : "mt-4")}>
        <AmountInWords
          amount={doc.total}
          currency={doc.currency}
          accent={ACCENT}
          compact={dense}
          intro="Arrêtée le présent devis à la somme de"
          variant={isConseilDesign ? "reference" : "default"}
        />
      </div>

      <div className={cn("flex justify-end", dense ? "mt-2" : isConseilDesign ? "mt-2" : "mt-4")}>
        <ManagerSignature
          applied={
            !accountantSignatory &&
            (doc.status === "signed" ||
              doc.status === "sent" ||
              doc.status === "accepted")
          }
          managerName={signatoryName}
          signatureUrl={company.stampUrl?.trim() || ""}
          signatoryTitle={signatoryName}
          accent={ACCENT}
          compact={dense}
          forPdf={compact || accountantSignatory}
          omitStamp={omitSignature || accountantSignatory}
          cabinet={doc.cabinet}
        />
      </div>

      <LegalFooter
        name={company.name}
        capital={company.capital || COMPANY_DEFAULTS[doc.cabinet]?.capital}
        address={company.address}
        city={company.city}
        nif={company.nif}
        niu={company.niu}
        rccm={company.rccm}
        cnss={company.cnss}
        phone={company.phone}
        email={company.email}
        website={company.website}
        niuLabel={niuLabel}
        compact={dense}
        className={DOC_TEXT.small}
      />
    </PreviewShell>
  );
});

/** Modalités / conditions : barre pleine en design papier, encadré vert sinon. */
function TermsPanel({
  title,
  referenceDesign,
  compact,
  children,
}: {
  title: string;
  referenceDesign?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  if (referenceDesign) {
    return (
      <InfoPanel title={title} accent={ACCENT} compact={compact} tint={TINT}>
        {children}
      </InfoPanel>
    );
  }

  return (
    <div
      className={cn("rounded-lg", compact ? "p-2.5" : "p-3.5")}
      style={{
        background: `${ACCENT_TO}18`,
        boxShadow: `inset 0 0 0 1px ${ACCENT_TO}88`,
      }}
    >
      <div
        className={cn("font-bold uppercase tracking-wider", DOC_TEXT.small)}
        style={{ color: ACCENT }}
      >
        {title}
      </div>
      <p className={cn("text-[#334155]", compact ? "mt-0.5" : "mt-1", DOC_TEXT.small)}>
        {children}
      </p>
    </div>
  );
}
