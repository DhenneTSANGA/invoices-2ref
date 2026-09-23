import { forwardRef, type ReactNode } from "react";
import type { CompanyInfo, Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { number, longDate } from "@/lib/format";
import {
  AmountRow,
  DOC_SHELL,
  DOC_TEXT,
  LegalFooter,
  PreviewLogo,
  PreviewShell,
  AmountInWords,
  DocumentClientRef,
  PreviewBottomRow,
  TimesNum,
  timesDigits,
  TIMES_NUMERALS,
} from "./PreviewShell";
import { computeDocumentTotals, documentTaxRates } from "@/lib/document-math";
import {
  COMPANY_DEFAULTS,
  DOCUMENT_COLORS,
  niuLabelForCabinet,
  CONSEIL_CLOSING,
  CONSEIL_LEGAL_FOOTER,
  CONSEIL_PAPER_COLORS,
  CONSEIL_BAR_FILL,
} from "@/lib/cabinets";
import { ManagerSignature } from "@/components/signature/ManagerSignature";
import { clientDocumentLines, clientConseilDocumentLines } from "@/lib/client-address";
import {
  dueMonthMention,
  shouldAppendDueMonthToLines,
} from "@/lib/subscription";
import {
  formatLineQuantity,
  formatPrintedFigure,
  hasMixedQuantityUnits,
  lineQuantityForTotal,
  quantityColumnHeader,
  shouldHidePrintedZeros,
} from "@/lib/line-quantity";
import { cn } from "@/lib/utils";
import {
  isAccountantSignatory,
  signatoryDisplayName,
} from "@/lib/signatory";

/** Couleurs et surfaces — papier 2R Conseil (facture et devis). */
const REF = CONSEIL_PAPER_COLORS;

/** Hauteur visible du logo en en-tête : cale sur le bloc titre + métadonnées. */
const HEADER_LOGO_HEIGHT = 88;

/** Grille 2 colonnes partagée (en-tête, émetteur/client) — alignement PDF stable. */
const TWO_COL = {
  table: { width: "100%", borderCollapse: "collapse" as const, tableLayout: "fixed" as const },
  left: { width: "50%", verticalAlign: "top" as const, paddingRight: "12px" },
  right: { width: "50%", verticalAlign: "top" as const, paddingLeft: "12px" },
};

type Props = {
  doc: Document;
  compact?: boolean;
  variant?: "full" | "thumb";
  className?: string;
  omitSignature?: boolean;
};

function partyContactLine(parts: Array<string | undefined | null>) {
  return parts.map((p) => p?.trim()).filter(Boolean).join(" · ");
}

function partyAddressLines(parts: Array<string | undefined | null>) {
  return parts.map((p) => p?.trim()).filter((p): p is string => Boolean(p));
}

export const InvoicePreview = forwardRef<HTMLDivElement, Props>(function InvoicePreview(
  { doc, compact, variant = "full", className, omitSignature },
  ref,
) {
  const { company, client } = usePreviewData(doc);
  const isThumb = variant === "thumb";
  /** Pas de densification : le PDF doit matcher l’aperçu écran. */
  const dense = false;
  const { accent: brandAccent, accentTo: brandAccentTo } = DOCUMENT_COLORS.invoice;
  /** Design facture papier 2R Conseil — uniquement pour le cabinet conseil. */
  const isConseilDesign = doc.cabinet === "conseil";
  const accent = isConseilDesign ? REF.accent : brandAccent;
  const accentTo = isConseilDesign ? REF.accentTo : brandAccentTo;

  const niuLabel = niuLabelForCabinet(doc.cabinet);
  const accountantSignatory = isAccountantSignatory(doc.signatoryTitle);
  const signatoryName = signatoryDisplayName(doc.signatoryTitle);

  const emitterLines = isConseilDesign
    ? partyAddressLines([
        company.address,
        company.city,
        company.phone,
        company.email,
        company.website,
      ])
    : partyAddressLines([
        company.address,
        company.city,
        partyContactLine([company.phone, company.email]),
        company.website,
      ]);

  const clientLines = client
    ? isConseilDesign
      ? clientConseilDocumentLines(client)
      : clientDocumentLines(client)
    : undefined;

  /* Capital / NIF / RCCM de l’émetteur restent dans le pied de page légal. */
  const emitterBlock = (
    <PartyBlock
      title={isConseilDesign ? "" : "Émetteur"}
      accent={isConseilDesign ? accent : "#64748B"}
      name={company.name}
      lines={emitterLines}
      niu={company.niu}
      niuLabel={niuLabel}
      referenceDesign={isConseilDesign}
      muted={!isConseilDesign}
      compact={dense}
    />
  );

  const clientBlock = (
    <PartyBlock
      title={isConseilDesign ? "Nom du CLIENT" : "Client"}
      accent={isConseilDesign ? accent : "#64748B"}
      name={client?.name?.trim() || undefined}
      lines={clientLines}
      nif={client?.nif}
      niu={client?.niu}
      rccm={isConseilDesign ? undefined : client?.rccm}
      phone={isConseilDesign ? client?.phone : undefined}
      referenceDesign={isConseilDesign}
      muted={!isConseilDesign}
      compact={dense}
    />
  );

  return (
    <PreviewShell
      innerRef={ref}
      accent={accent}
      compact={compact}
      isThumb={isThumb}
      className={className}
      {...DOC_SHELL}
      pagePaddingBottomMm={isConseilDesign ? 8 : undefined}
    >
      {isConseilDesign ? (
        <>
          {/* Ligne juste sous logo + titre FACTURE — méta et parties en dessous. */}
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
                      style={{ color: REF.title }}
                    >
                      FACTURE
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
                  <div className={cn("leading-[1.2]", DOC_TEXT.small)}>
                    <div className="leading-[1.2]" style={{ color: REF.title }}>
                      <span>N° de facture : </span>
                      <TimesNum className="font-semibold">{doc.number}</TimesNum>
                    </div>
                    <div className="leading-[1.2]" style={{ color: REF.title }}>
                      <span>Date : </span>
                      <TimesNum className="font-semibold">
                        {longDate(doc.issueDate)}
                      </TimesNum>
                    </div>
                    <DocumentClientRef
                      clientRef={client?.clientRef}
                      className="leading-[1.2]"
                      timesNumerals
                      color={REF.title}
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      ) : (
        <>
          <div
            className="flex items-center justify-between gap-4 border-b-2 pb-3"
            style={{ borderColor: accent }}
          >
            <div className="shrink-0">
              <PreviewLogo cabinet={doc.cabinet} className="h-40" />
            </div>
            <div className="shrink-0 text-right">
              <div
                className="font-display font-bold uppercase tracking-wide text-[30px]"
                style={{ color: accent }}
              >
                FACTURE
              </div>
              <div className={cn("mt-0.5 font-semibold", DOC_TEXT.base)}>N° {doc.number}</div>
              <div className={cn("text-[#64748B]", DOC_TEXT.small)}>{longDate(doc.issueDate)}</div>
              <DocumentClientRef clientRef={client?.clientRef} />
            </div>
          </div>

          <table className="mt-3" style={TWO_COL.table}>
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
          <b className={cn("text-[#0F172A]", DOC_TEXT.base)}>
            {isConseilDesign ? (
              <TimesNum>{longDate(doc.dueDate)}</TimesNum>
            ) : (
              longDate(doc.dueDate)
            )}
          </b>
        </div>
      ) : null}

      <ItemsTable
        doc={doc}
        accent={accent}
        headerFrom={accent}
        headerTo={accentTo}
        compact={dense}
        referenceDesign={isConseilDesign}
      />

      {isConseilDesign ? (
        <>
          <PreviewBottomRow
            compact={dense}
            left={<div />}
            right={
              <TotalsBlock
                doc={doc}
                accent={accent}
                compact={dense}
                referenceDesign
              />
            }
          />
          <div className={cn("w-full", dense ? "mt-2" : "mt-2.5")}>
            <AmountInWords
              amount={doc.total}
              currency={doc.currency}
              accent={accent}
              compact={dense}
              variant="reference"
              prominent
            />
          </div>
          <PreviewBottomRow
            compact={dense}
            className="mt-2"
            left={
              <div className={cn("space-y-2", dense ? "space-y-1.5" : "space-y-2")}>
                {doc.paymentTerms?.trim() ? (
                  <InfoPanel title="Modalité de paiement" accent={accent} compact={dense}>
                    {doc.paymentTerms.trim()}
                  </InfoPanel>
                ) : null}
                <InfoPanel title="RIB pour le règlement" accent={accent} compact={dense}>
                  <div>Règlement par virement bancaire ou par chèque.</div>
                  {company.bankName ? (
                    <div className="mt-0.5">
                      <span className="text-[#64748B]">Banque : </span>
                      {company.bankName}
                    </div>
                  ) : null}
                  {company.bankAccount ? (
                    <div className="mt-0.5 break-words">
                      <span className="text-[#64748B]">RIB : </span>
                      <TimesNum>{company.bankAccount}</TimesNum>
                    </div>
                  ) : null}
                  <div className="mt-0.5">{CONSEIL_CLOSING.cheque}</div>
                </InfoPanel>
              </div>
            }
            right={<div />}
          />
          <div className="mt-auto flex justify-end pt-4">
            <ManagerSignature
              applied={
                !accountantSignatory &&
                (doc.status === "signed" || doc.status === "sent" || doc.status === "paid")
              }
              managerName={signatoryName}
              signatureUrl={company.stampUrl?.trim() || ""}
              signatoryTitle={signatoryName}
              accent={accent}
              compact={dense}
              forPdf={compact}
              omitStamp={omitSignature || accountantSignatory}
              cabinet={doc.cabinet}
            />
          </div>
        </>
      ) : (
        <>
          <PreviewBottomRow
            compact={dense}
            left={
              <LegacyPaymentPanels
                doc={doc}
                company={company}
                compact={dense}
              />
            }
            right={
              <TotalsBlock
                doc={doc}
                accent={accent}
                compact={dense}
              />
            }
          />
          <div className={cn("w-full", dense ? "mt-2" : "mt-2.5")}>
            <AmountInWords
              amount={doc.total}
              currency={doc.currency}
              accent={accent}
              compact={dense}
            />
          </div>
          <div className={cn("flex justify-end", dense ? "mt-2" : "mt-2")}>
            <ManagerSignature
              applied={
                !accountantSignatory &&
                (doc.status === "signed" || doc.status === "sent" || doc.status === "paid")
              }
              managerName={signatoryName}
              signatureUrl={company.stampUrl?.trim() || ""}
              signatoryTitle={signatoryName}
              accent={accent}
              compact={dense}
              forPdf={compact}
              omitStamp={omitSignature || accountantSignatory}
              cabinet={doc.cabinet}
            />
          </div>
        </>
      )}

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
        closingThanks={isConseilDesign ? CONSEIL_CLOSING.thanks : undefined}
        thanksColor={isConseilDesign ? CONSEIL_CLOSING.thanksColor : undefined}
        legalText={isConseilDesign ? CONSEIL_LEGAL_FOOTER : undefined}
        className={cn(DOC_TEXT.small, isConseilDesign && "mt-4")}
      />
    </PreviewShell>
  );
});

/** Modalités + RIB — style d’origine (2R Expertise Fiscale). */
function LegacyPaymentPanels({
  doc,
  company,
  compact,
}: {
  doc: Document;
  company: CompanyInfo;
  compact?: boolean;
}) {
  const label = cn("font-bold uppercase tracking-wider text-[#64748B]", DOC_TEXT.small);

  return (
    <div className={cn("space-y-2", compact ? "space-y-1.5" : "space-y-2")}>
      {doc.paymentTerms?.trim() ? (
        <div className={cn("rounded-lg bg-[#F1F5F9]", compact ? "p-2" : "p-2.5")}>
          <div className={label}>Modalité de paiement</div>
          <div className={cn("mt-0.5 leading-snug text-[#334155]", DOC_TEXT.small)}>
            {doc.paymentTerms.trim()}
          </div>
        </div>
      ) : null}
      {doc.showRib ? (
        <div className={cn("rounded-lg bg-[#F1F5F9]", compact ? "p-2" : "p-2.5")}>
          <div className={label}>RIB pour le règlement</div>
          <div className={cn("mt-0.5 leading-snug text-[#334155]", DOC_TEXT.small)}>
            Règlement par virement bancaire ou par chèque.
          </div>
          {company.bankName ? (
            <div className={cn("mt-0.5 text-[#334155]", DOC_TEXT.small)}>
              <span className="text-[#64748B]">Banque : </span>
              {company.bankName}
            </div>
          ) : null}
          {company.bankAccount ? (
            <div className={cn("mt-0.5 break-words text-[#334155]", DOC_TEXT.small)}>
              <span className="text-[#64748B]">RIB : </span>
              {company.bankAccount}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Bloc titré barre pleine + fond teinté (style facture papier). */
function InfoPanel({
  title,
  accent,
  compact,
  tint = REF.paymentBg,
  children,
}: {
  title: string;
  accent: string;
  compact?: boolean;
  tint?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden">
      <div
        className={cn(
          "text-center font-bold uppercase tracking-wide text-white",
          compact ? "px-2 py-1" : "px-2.5 py-1.5",
          DOC_TEXT.small,
        )}
        style={{ background: CONSEIL_BAR_FILL }}
      >
        {title}
      </div>
      <div
        className={cn(
          "leading-snug text-[#334155]",
          compact ? "p-2" : "p-2.5",
          DOC_TEXT.small,
        )}
        style={{ background: tint }}
      >
        {children}
      </div>
    </div>
  );
}

function PartyBlock({
  title,
  accent,
  name,
  lines,
  capital,
  nif,
  niu,
  niuLabel = "NIU",
  rccm,
  cnss,
  cnamgs,
  phone,
  muted,
  bordered,
  referenceDesign,
  compact,
}: {
  title: string;
  accent: string;
  name?: string;
  lines?: string[];
  /** Capital social (émetteur). */
  capital?: string;
  nif?: string;
  niu?: string;
  niuLabel?: string;
  rccm?: string;
  cnss?: string;
  cnamgs?: string;
  /** Téléphone client (2R Conseil) : affiché seulement s’il n’y a pas de NIF. */
  phone?: string;
  muted?: boolean;
  bordered?: boolean;
  referenceDesign?: boolean;
  compact?: boolean;
}) {
  const ids = [
    capital ? { label: "Capital", value: capital } : null,
    nif && nif !== "—" ? { label: "NIF", value: nif } : null,
    niu && niu !== "—" ? { label: niuLabel, value: niu } : null,
    rccm && rccm !== "—" ? { label: "RCCM", value: rccm } : null,
    cnss ? { label: "CNSS", value: cnss } : null,
    cnamgs ? { label: "CNAMGS", value: cnamgs } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const hasNif = Boolean(nif && nif !== "—");
  /** Téléphone client : uniquement s’il n’y a pas de NIF. */
  const phoneLine = hasNif ? "" : phone?.trim() || "";

  const pad = compact ? "p-2" : "p-2.5";
  const heading = title.trim();

  if (referenceDesign) {
    /* Calibri/Arial + casse du papier : émetteur mixte, client et ville en capitales. */
    const face = { fontFamily: 'Calibri, Arial, sans-serif' } as const;
    const line = "leading-[1.2] break-words";
    const isClientParty = Boolean(heading);
    return (
      <div className={cn("leading-[1.2]", DOC_TEXT.small)} style={face}>
        {heading ? (
          <div className={cn(line, DOC_TEXT.small, "text-[#0F172A]")}>
            {heading}
          </div>
        ) : null}
        {name ? (
          <>
            <div
              className={cn("font-bold text-[#0F172A]", line, DOC_TEXT.base)}
            >
              {isClientParty ? name.toUpperCase() : name}
            </div>
            {lines?.map((l, i) => {
              const contact = /@/.test(l) || /^www\./i.test(l);
              const bp = /^BP\b/i.test(l);
              const display = !contact && !bp ? l.toUpperCase() : l;
              return (
                <div key={i} className={cn(line, "text-[#0F172A]")}>
                  {timesDigits(display)}
                </div>
              );
            })}
            {ids.map((id) => (
              <div key={id.label} className={cn(line, "text-[#0F172A]")}>
                {id.label === "Capital" ? (
                  <b className={DOC_TEXT.base}>{timesDigits(id.value)}</b>
                ) : id.label === "NIF" && isClientParty ? (
                  <b className={DOC_TEXT.base}>
                    {id.label}:{timesDigits(id.value)}
                  </b>
                ) : (
                  <>
                    {id.label}:{timesDigits(id.value)}
                  </>
                )}
              </div>
            ))}
            {phoneLine ? (
              <div className={cn(line, "text-[#0F172A]")}>{timesDigits(phoneLine)}</div>
            ) : null}
          </>
        ) : (
          <div className={cn(line, "italic text-[#94A3B8]")}>Sélectionnez un client…</div>
        )}
      </div>
    );
  }

  return (
    <div
      className={
        muted
          ? `rounded-lg bg-[#F1F5F9] ${pad}`
          : bordered
            ? `rounded-lg border-2 ${pad}`
            : `rounded-lg ${pad}`
      }
      style={bordered ? { borderColor: `${accent}33` } : undefined}
    >
      <div
        className={cn("font-bold uppercase tracking-wider", DOC_TEXT.small)}
        style={{ color: accent }}
      >
        {heading}
      </div>
      {name ? (
        <>
          <div
            className={cn(
              "font-semibold leading-snug break-words",
              compact ? "mt-1" : "mt-1.5",
              DOC_TEXT.base,
            )}
          >
            {name}
          </div>
          {lines?.map((l, i) => (
            <div
              key={i}
              className={cn("leading-snug text-[#475569] break-words", DOC_TEXT.small)}
            >
              {l}
            </div>
          ))}
          {ids.length > 0 && (
            <div
              className={cn(
                "grid grid-cols-1 gap-y-0.5 text-[#475569] sm:grid-cols-2 sm:gap-x-2",
                compact ? "mt-1" : "mt-1.5",
                DOC_TEXT.small,
              )}
            >
              {ids.map((id) => (
                <span
                  key={id.label}
                  className={
                    id.label === "Capital" ||
                    id.label === "RCCM" ||
                    id.label === "CNSS" ||
                    id.label === "CNAMGS"
                      ? "sm:col-span-2"
                      : undefined
                  }
                >
                  {id.label === "Capital" ? (
                    <b className={cn("text-[#0F172A]", DOC_TEXT.base)}>{id.value}</b>
                  ) : (
                    <>
                      {id.label}:{" "}
                      <b className={cn("text-[#0F172A]", DOC_TEXT.base)}>{id.value}</b>
                    </>
                  )}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className={cn("italic text-[#94A3B8]", compact ? "mt-1" : "mt-2", DOC_TEXT.small)}>
          Sélectionnez un client…
        </div>
      )}
    </div>
  );
}

/** Tableau de lignes — avec sections (tâches) optionnelles. */
function ItemsTable({
  doc,
  accent,
  headerFrom,
  headerTo,
  compact,
  referenceDesign,
  sectionTint = REF.sectionBg,
}: {
  doc: Document;
  accent?: string;
  headerFrom?: string;
  headerTo?: string;
  compact?: boolean;
  referenceDesign?: boolean;
  /** Fond du titre de tâche en style référence. */
  sectionTint?: string;
  /** @deprecated Ignoré — taxes uniquement dans les totaux. */
  showTaxColumns?: boolean;
}) {
  const solidAccent = accent ?? headerFrom ?? "#01004C";
  const headerStyle = referenceDesign
    ? { background: CONSEIL_BAR_FILL }
    : { background: `linear-gradient(90deg, ${headerFrom ?? solidAccent}, ${headerTo ?? solidAccent})` };

  const cell = compact ? "px-2 py-1.5" : "px-2.5 py-2";
  /** Même hauteur que la barre « Tâche ». */
  const headerCell = cn(
    cell,
    referenceDesign && "whitespace-nowrap leading-none",
  );
  const sections = [...(doc.sections ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const hasSections = sections.length > 0;

  const renderLinesTable = (
    items: Document["items"],
    keyPrefix = "",
    framed = true,
    dueMonthRow = false,
  ) => {
    const qtyHeader = quantityColumnHeader(items);
    const showQty = qtyHeader != null;
    const mixedQty = hasMixedQuantityUnits(items);
    const colCount = showQty ? 5 : 4;
    return (
    <div
      className={
        framed
          ? referenceDesign
            ? "overflow-hidden"
            : "overflow-hidden rounded-lg ring-1 ring-[#E2E8F0]"
          : "overflow-hidden"
      }
    >
      <table className={cn("w-full border-collapse", DOC_TEXT.small)}>
        <thead>
          <tr
            style={headerStyle}
            className={cn(
              "text-white",
              referenceDesign ? DOC_TEXT.small : DOC_TEXT.base,
            )}
          >
            <th className={cn(headerCell, "w-8 text-left font-semibold")}></th>
            <th className={cn(headerCell, "text-left font-semibold")}>Désignation</th>
            {showQty ? (
              <th className={cn(headerCell, "w-14 text-right font-semibold")}>
                {qtyHeader}
              </th>
            ) : null}
            <th className={cn(headerCell, "w-[4.5rem] text-right font-semibold")}>
              P.U. HT
            </th>
            <th className={cn(headerCell, "w-24 text-right font-semibold")}>Total HT</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={colCount} className={cn(cell, "text-center italic text-[#94A3B8]")}>
                Aucune ligne.
              </td>
            </tr>
          )}
          {items.map((it, i) => {
            const lineTotal = lineQuantityForTotal(it) * it.unitPrice;
            const hideZero = shouldHidePrintedZeros(it, doc.cabinet);
            const qtyLabel = formatLineQuantity(it, { mixed: mixedQty });
            const unitPriceLabel = formatPrintedFigure(
              it.unitPrice,
              number(it.unitPrice),
              hideZero,
            );
            const totalLabel = formatPrintedFigure(
              lineTotal,
              number(lineTotal),
              hideZero,
            );
            const rowBg = referenceDesign
              ? i % 2 === 0
                ? "#fff"
                : REF.rowAlt
              : i % 2 === 0
                ? "bg-white"
                : "bg-[#F8FAFC]";
            return (
              <tr
                key={`${keyPrefix}${it.id}`}
                className={referenceDesign ? undefined : rowBg}
                style={referenceDesign ? { background: rowBg as string } : undefined}
              >
                <td
                  className={cn(cell, "align-top text-[#64748B]")}
                  style={referenceDesign ? { fontFamily: 'Georgia, "Times New Roman", serif' } : undefined}
                >
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className={cn(cell, "align-top leading-snug")}>
                  {referenceDesign ? timesDigits(it.description) : it.description}
                </td>
                {showQty ? (
                  <td
                    className={cn(cell, "text-right align-top", !referenceDesign && "font-mono")}
                    style={referenceDesign ? { fontFamily: 'Georgia, "Times New Roman", serif' } : undefined}
                  >
                    {referenceDesign && qtyLabel ? timesDigits(qtyLabel) : qtyLabel}
                  </td>
                ) : null}
                <td
                  className={cn(cell, "text-right align-top", !referenceDesign && "font-mono")}
                  style={
                    referenceDesign
                      ? { fontFamily: TIMES_NUMERALS, letterSpacing: "0.04em" }
                      : undefined
                  }
                >
                  {unitPriceLabel}
                </td>
                <td
                  className={cn(
                    cell,
                    "text-right align-top font-semibold",
                    DOC_TEXT.base,
                    !referenceDesign && "font-mono",
                  )}
                  style={
                    referenceDesign
                      ? { fontFamily: TIMES_NUMERALS, letterSpacing: "0.04em" }
                      : undefined
                  }
                >
                  {totalLabel}
                </td>
              </tr>
            );
          })}
          {dueMonthRow &&
          shouldAppendDueMonthToLines(doc) &&
          items.length > 0 ? (
            <tr
              className={
                referenceDesign
                  ? undefined
                  : items.length % 2 === 0
                    ? "bg-white"
                    : "bg-[#F8FAFC]"
              }
              style={
                referenceDesign
                  ? {
                      background:
                        items.length % 2 === 0 ? "#fff" : REF.rowAlt,
                    }
                  : undefined
              }
            >
              <td className={cn(cell, "align-top")} />
              <td
                colSpan={colCount - 1}
                className={cn(cell, "align-top font-bold leading-snug")}
              >
                {referenceDesign
                  ? timesDigits(dueMonthMention(doc.issueDate))
                  : dueMonthMention(doc.issueDate)}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
    );
  };

  if (!hasSections) {
    return (
      <div className={cn(compact ? "mt-2" : "mt-4")}>
        {renderLinesTable(doc.items, "", true, true)}
      </div>
    );
  }

  const unsectioned = doc.items.filter((it) => !it.sectionId);

  return (
    <div className={cn("space-y-3", compact ? "mt-2" : "mt-4")}>
      {sections.map((sec, idx) => {
        const items = doc.items.filter((it) => it.sectionId === sec.id);
        const isLastSection = idx === sections.length - 1 && unsectioned.length === 0;
        return (
          <div
            key={sec.id}
            className={
              referenceDesign ? "overflow-hidden" : "overflow-hidden rounded-lg ring-1 ring-[#E2E8F0]"
            }
          >
            <div
              className={cn(
                "text-center font-bold uppercase tracking-wider text-white leading-none",
                compact ? "px-2 py-1.5" : "px-2.5 py-2",
                DOC_TEXT.small,
              )}
              style={headerStyle}
            >
              {referenceDesign ? "Tâche" : "Prestation(s)"}
            </div>
            <div
              className={cn(
                "text-center font-semibold uppercase tracking-wide text-[#0F172A]",
                compact ? "px-2 py-1.5" : "px-2.5 py-2",
                DOC_TEXT.base,
              )}
              style={{ background: referenceDesign ? sectionTint : "#EFF6FF" }}
            >
              {(sec.title.trim() || "—").toUpperCase()}
            </div>
            {renderLinesTable(items, `${sec.id}-`, false, isLastSection)}
          </div>
        );
      })}
      {unsectioned.length > 0
        ? renderLinesTable(unsectioned, "loose-", true, true)
        : null}
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
  compact,
  referenceDesign,
  tint = REF.sectionBg,
}: {
  doc: Document;
  accent: string;
  compact?: boolean;
  referenceDesign?: boolean;
  /** Fond des lignes de totaux en style référence. */
  tint?: string;
}) {
  const amountVariant = referenceDesign ? "reference" : "default";
  const rates = documentTaxRates(doc.items);
  /** Max sur toutes les lignes — évite de rater la TPS si seule la 1ʳᵉ ligne est à 0. */
  const tpsRate = Math.max(
    rates.tpsRate,
    ...doc.items.map((it) => it.tpsRate || 0),
  );
  const vatRate = rates.vatRate;
  const cssRate = rates.cssRate;
  const discountPct = doc.discount ?? 0;

  /** TPS active dès qu’un taux ou un montant TPS est présent (TVA alors exclue). */
  const tpsActive = tpsRate > 0 || (doc.tps ?? 0) > 0;

  const computed = computeDocumentTotals(doc.items, {
    discount: discountPct,
    vatRate,
    cssRate,
    tpsRate: tpsActive ? (tpsRate > 0 ? tpsRate : rates.tpsRate) : 0,
    rounding: doc.totalRounding ?? 0,
  });

  const grossSubtotal = computed.grossSubtotal || doc.subtotal;
  const discountAmount = computed.discountAmount;
  const subtotal = computed.subtotal || doc.subtotal;
  const tps = tpsActive ? Math.max(computed.tps, doc.tps ?? 0) : 0;
  const css = computed.css || doc.css || 0;
  const vat = tpsActive ? 0 : (computed.vat || doc.vat || 0);
  const total = computed.total;

  const displayTpsRate =
    tpsRate > 0
      ? tpsRate
      : subtotal > 0 && tps > 0
        ? Math.round((tps / subtotal) * 10000) / 100
        : 0;

  return (
    <div className="w-full">
      <div
        className={
          referenceDesign ? "overflow-hidden" : "overflow-hidden rounded-lg ring-1 ring-[#E2E8F0]"
        }
      >
        <AmountRow
          label="Sous-total HT"
          value={number(grossSubtotal)}
          currency={doc.currency}
          accent={accent}
          compact={compact}
          variant={amountVariant}
          tint={tint}
        />
        {discountAmount > 0 ? (
          <AmountRow
            label={`Remise (${discountPct} %)`}
            value={number(-discountAmount)}
            currency={doc.currency}
            accent={accent}
            compact={compact}
            variant={amountVariant}
            tint={tint}
          />
        ) : null}
        {discountAmount > 0 ? (
          <AmountRow
            label="HT net"
            value={number(subtotal)}
            currency={doc.currency}
            accent={accent}
            compact={compact}
            variant={amountVariant}
            tint={tint}
          />
        ) : null}
        {tpsActive ? (
          <AmountRow
            label={
              displayTpsRate > 0 ? `TPS (${displayTpsRate} %)` : "TPS"
            }
            value={number(-tps)}
            currency={doc.currency}
            accent={accent}
            compact={compact}
            variant={amountVariant}
            tint={tint}
          />
        ) : null}
        <AmountRow
          label={`CSS (${cssRate} %)`}
          value={number(css)}
          currency={doc.currency}
          accent={accent}
          compact={compact}
          variant={amountVariant}
          tint={tint}
        />
        {!tpsActive ? (
          <AmountRow
            label={`TVA (${vatRate} %)`}
            value={number(vat)}
            currency={doc.currency}
            accent={accent}
            compact={compact}
            variant={amountVariant}
            tint={tint}
          />
        ) : null}
        <AmountRow
          label="Total TTC"
          value={number(total)}
          currency={doc.currency}
          strong
          accent={accent}
          compact={compact}
          variant={amountVariant}
          tint={tint}
        />
      </div>
    </div>
  );
}

export {
  HEADER_LOGO_HEIGHT,
  InfoPanel,
  TWO_COL,
  ItemsTable,
  PartyBlock,
  StampBox,
  TotalsBlock,
  partyAddressLines,
  partyContactLine,
};
