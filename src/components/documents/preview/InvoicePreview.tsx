import { forwardRef, type ReactNode } from "react";
import type { CompanyInfo, Document } from "@/store/types";
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
import { COMPANY_DEFAULTS, DOCUMENT_COLORS, niuLabelForCabinet } from "@/lib/cabinets";
import { ManagerSignature } from "@/components/signature/ManagerSignature";
import { clientDisplayName, clientDocumentLines } from "@/lib/client-address";
import { cn } from "@/lib/utils";
import {
  isAccountantSignatory,
  signatoryDisplayName,
} from "@/lib/signatory";

/** Couleurs et surfaces — facture papier 2R Conseil (référence visuelle). */
const REF = {
  sectionBg: "#D9E2EF",
  rowAlt: "#EEF2F7",
  paymentBg: "#EEF2F7",
} as const;

/** Grille 2 colonnes partagée (en-tête, émetteur/client) — alignement PDF stable. */
const TWO_COL = {
  table: { width: "100%", borderCollapse: "collapse" as const, tableLayout: "fixed" as const },
  left: { width: "50%", verticalAlign: "top" as const, paddingRight: "12px" },
  right: { width: "50%", verticalAlign: "top" as const, paddingLeft: "12px" },
  headerLeft: { width: "50%", verticalAlign: "middle" as const, paddingRight: "12px" },
  headerRight: { width: "50%", verticalAlign: "middle" as const, paddingLeft: "12px" },
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
  const { accent, accentTo } = DOCUMENT_COLORS.invoice;
  /** Design facture papier 2R Conseil — uniquement pour le cabinet conseil. */
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

  return (
    <PreviewShell innerRef={ref} accent={accent} compact={compact} isThumb={isThumb} className={className}>
      {isConseilDesign ? (
        <table className={cn(dense ? "pb-2" : "pb-2.5")} style={TWO_COL.table}>
          <tbody>
            <tr>
              <td style={TWO_COL.headerLeft}>
                <PreviewLogo cabinet={doc.cabinet} className={dense ? "h-24" : "h-28"} />
              </td>
              <td style={{ ...TWO_COL.headerRight, textAlign: "right" }}>
                <div
                  className={cn(
                    "font-serif font-bold uppercase leading-none tracking-wide",
                    dense ? "text-[26px]" : "text-[34px]",
                  )}
                  style={{ color: accent }}
                >
                  FACTURE
                </div>
                <div className={cn("mt-1 space-y-0.5", dense ? "text-[10px]" : "text-[12px]")}>
                  <div>
                    <span className="text-[#64748B]">N° de facture : </span>
                    <span className="font-semibold text-[#0F172A]">{doc.number}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Date : </span>
                    <span className="font-semibold text-[#0F172A]">{longDate(doc.issueDate)}</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <div
          className={cn(
            "flex items-center justify-between border-b-2",
            dense ? "gap-3 pb-2.5" : "gap-4 pb-3",
          )}
          style={{ borderColor: accent }}
        >
          <div className="shrink-0">
            <PreviewLogo cabinet={doc.cabinet} className="h-40" />
          </div>
          <div className="shrink-0 text-right">
            <div
              className={cn(
                "font-display font-bold uppercase tracking-wide",
                dense ? "text-[22px]" : "text-[30px]",
              )}
              style={{ color: accent }}
            >
              FACTURE
            </div>
            <div className={cn("mt-0.5 font-semibold", dense ? "text-[11px]" : "text-[13px]")}>
              N° {doc.number}
            </div>
            <div className={cn("text-[#64748B]", dense ? "text-[10px]" : "text-[12px]")}>
              {longDate(doc.issueDate)}
            </div>
          </div>
        </div>
      )}

      <table className={cn(dense ? "mt-2.5" : "mt-3")} style={TWO_COL.table}>
        <tbody>
          <tr>
            <td style={TWO_COL.left}>
              <PartyBlock
                title="Émetteur"
                accent={isConseilDesign ? accent : "#64748B"}
                name={company.name}
                lines={emitterLines}
                capital={
                  company.capital || COMPANY_DEFAULTS[doc.cabinet]?.capital
                }
                nif={company.nif}
                niu={company.niu}
                niuLabel={niuLabel}
                rccm={company.rccm}
                referenceDesign={isConseilDesign}
                muted={!isConseilDesign}
                compact={dense}
              />
            </td>
            <td style={TWO_COL.right}>
              <PartyBlock
                title="Client"
                accent={isConseilDesign ? accent : "#64748B"}
                name={client ? clientDisplayName(client) : undefined}
                lines={clientLines}
                nif={client?.nif}
                niu={client?.niu}
                rccm={client?.rccm}
                referenceDesign={isConseilDesign}
                muted={!isConseilDesign}
                compact={dense}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div
        className={cn(
          "flex flex-wrap text-[#475569]",
          dense ? "mt-2 gap-x-5 gap-y-0.5 text-[10px]" : "mt-2.5 gap-x-6 gap-y-1 text-[12px]",
        )}
      >
        {doc.dueDate?.trim() ? (
          <span>
            Date d&apos;échéance :{" "}
            <b className="text-[#0F172A]">{longDate(doc.dueDate)}</b>
          </span>
        ) : null}
      </div>

      <ItemsTable
        doc={doc}
        accent={accent}
        headerFrom={accent}
        headerTo={accentTo}
        compact={dense}
        referenceDesign={isConseilDesign}
      />

      <PreviewBottomRow
        compact={dense}
        left={
          isConseilDesign ? (
            <div className={cn("space-y-2", dense ? "space-y-1.5" : "space-y-2")}>
              {doc.paymentTerms?.trim() ? (
                <InfoPanel title="Modalité de paiement" accent={accent} compact={dense}>
                  {doc.paymentTerms.trim()}
                </InfoPanel>
              ) : null}
              {company.bankName || company.bankAccount ? (
                <InfoPanel title="RIB pour le règlement" accent={accent} compact={dense}>
                  <div>Règlement par virement bancaire ou par chèque.</div>
                  {company.bankName ? (
                    <div className={cn("mt-0.5", dense ? "text-[10px]" : "text-[12px]")}>
                      <span className="text-[#64748B]">Banque : </span>
                      {company.bankName}
                    </div>
                  ) : null}
                  {company.bankAccount ? (
                    <div className={cn("break-words", dense ? "text-[10px]" : "mt-0.5 text-[12px]")}>
                      <span className="text-[#64748B]">RIB : </span>
                      {company.bankAccount}
                    </div>
                  ) : null}
                </InfoPanel>
              ) : null}
            </div>
          ) : (
            <LegacyPaymentPanels
              doc={doc}
              company={company}
              compact={dense}
            />
          )
        }
        right={
          <TotalsBlock
            doc={doc}
            accent={accent}
            compact={dense}
            referenceDesign={isConseilDesign}
          />
        }
      />

      <div className={cn("w-full", dense ? "mt-2" : "mt-2.5")}>
        <AmountInWords
          amount={doc.total}
          currency={doc.currency}
          accent={accent}
          compact={dense}
          variant={isConseilDesign ? "reference" : "default"}
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
  return (
    <div className={cn("space-y-2", compact ? "space-y-1.5" : "space-y-2")}>
      {doc.paymentTerms?.trim() ? (
        <div className={cn("rounded-lg bg-[#F1F5F9]", compact ? "p-2" : "p-2.5")}>
          <div
            className={cn(
              "font-bold uppercase tracking-wider text-[#64748B]",
              compact ? "text-[9px]" : "text-[11px]",
            )}
          >
            Modalité de paiement
          </div>
          <div
            className={cn(
              "mt-0.5 leading-snug text-[#334155]",
              compact ? "text-[9px]" : "text-[11px]",
            )}
          >
            {doc.paymentTerms.trim()}
          </div>
        </div>
      ) : null}
      {company.bankName || company.bankAccount ? (
        <div className={cn("rounded-lg bg-[#F1F5F9]", compact ? "p-2" : "p-2.5")}>
          <div
            className={cn(
              "font-bold uppercase tracking-wider text-[#64748B]",
              compact ? "text-[9px]" : "text-[11px]",
            )}
          >
            RIB pour le règlement
          </div>
          <div
            className={cn(
              "mt-0.5 leading-snug text-[#334155]",
              compact ? "text-[9px]" : "text-[11px]",
            )}
          >
            Règlement par virement bancaire ou par chèque.
          </div>
          {company.bankName ? (
            <div className={cn("mt-0.5 text-[#334155]", compact ? "text-[10px]" : "text-[12px]")}>
              <span className="text-[#64748B]">Banque : </span>
              {company.bankName}
            </div>
          ) : null}
          {company.bankAccount ? (
            <div className={cn("break-words text-[#334155]", compact ? "text-[10px]" : "mt-0.5 text-[12px]")}>
              <span className="text-[#64748B]">RIB : </span>
              {company.bankAccount}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InfoPanel({
  title,
  accent,
  compact,
  children,
}: {
  title: string;
  accent: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden">
      <div
        className={cn(
          "text-center font-bold uppercase tracking-wide text-white",
          compact ? "px-2 py-1 text-[9px]" : "px-2.5 py-1.5 text-[11px]",
        )}
        style={{ background: accent }}
      >
        {title}
      </div>
      <div
        className={cn(
          "leading-snug text-[#334155]",
          compact ? "p-2 text-[9px]" : "p-2.5 text-[11px]",
        )}
        style={{ background: REF.paymentBg }}
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

  const pad = compact ? "p-2" : "p-2.5";

  if (referenceDesign) {
    return (
      <div className={cn("h-full leading-snug", compact ? "text-[10px]" : "text-[12px]")}>
        <div
          className={cn(
            "min-h-[1.1em] font-bold uppercase leading-none tracking-wide",
            compact ? "text-[10px]" : "text-[12px]",
          )}
          style={{ color: accent }}
        >
          {title}
        </div>
        {name ? (
          <>
            <div
              className={cn(
                "mt-1 font-bold uppercase leading-snug break-words text-[#0F172A]",
                compact ? "text-[11px]" : "text-[13px]",
              )}
            >
              {name}
            </div>
            {lines?.map((l, i) => (
              <div key={i} className="mt-0.5 break-words text-[#334155]">
                {l}
              </div>
            ))}
            {ids.length > 0 && (
              <div className={cn("mt-1 space-y-0.5 text-[#334155]", compact ? "text-[10px]" : "text-[12px]")}>
                {ids.map((id) => (
                  <div key={id.label}>
                    {id.label === "Capital" ? (
                      <b className="text-[#0F172A]">{id.value}</b>
                    ) : (
                      <>
                        {id.label} : <b className="text-[#0F172A]">{id.value}</b>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className={cn("mt-1 italic text-[#94A3B8]", compact ? "text-[10px]" : "text-[12px]")}>
            Sélectionnez un client…
          </div>
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
        className={cn("font-bold uppercase tracking-wider", compact ? "text-[9px]" : "text-[11px]")}
        style={{ color: accent }}
      >
        {title}
      </div>
      {name ? (
        <>
          <div
            className={cn(
              "font-semibold leading-snug break-words",
              compact ? "mt-1 text-[12px]" : "mt-1.5 text-[14px]",
            )}
          >
            {name}
          </div>
          {lines?.map((l, i) => (
            <div
              key={i}
              className={cn("leading-snug text-[#475569] break-words", compact ? "text-[10px]" : "text-[12px]")}
            >
              {l}
            </div>
          ))}
          {ids.length > 0 && (
            <div
              className={cn(
                "grid grid-cols-1 gap-y-0.5 text-[#475569] sm:grid-cols-2 sm:gap-x-2",
                compact ? "mt-1 text-[9px]" : "mt-1.5 text-[11px]",
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
                    <b className="text-[#0F172A]">{id.value}</b>
                  ) : (
                    <>
                      {id.label}: <b className="text-[#0F172A]">{id.value}</b>
                    </>
                  )}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className={cn("italic text-[#94A3B8]", compact ? "mt-1 text-[10px]" : "mt-2 text-[12px]")}>
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
}: {
  doc: Document;
  accent?: string;
  headerFrom?: string;
  headerTo?: string;
  compact?: boolean;
  referenceDesign?: boolean;
  /** @deprecated Ignoré — taxes uniquement dans les totaux. */
  showTaxColumns?: boolean;
}) {
  const solidAccent = accent ?? headerFrom ?? "#01004C";
  const headerStyle = referenceDesign
    ? { background: solidAccent }
    : { background: `linear-gradient(90deg, ${headerFrom ?? solidAccent}, ${headerTo ?? solidAccent})` };

  const cell = compact ? "px-2 py-1.5" : "px-2.5 py-2";
  const sections = [...(doc.sections ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const hasSections = sections.length > 0;

  const renderLinesTable = (
    items: Document["items"],
    keyPrefix = "",
    framed = true,
  ) => (
    <div
      className={
        framed
          ? referenceDesign
            ? "overflow-hidden"
            : "overflow-hidden rounded-lg ring-1 ring-[#E2E8F0]"
          : "overflow-hidden"
      }
    >
      <table className={cn("w-full border-collapse", compact ? "text-[10px]" : "text-[12px]")}>
        <thead>
          <tr style={headerStyle} className="text-white">
            <th className={cn(cell, "w-8 text-left font-semibold")}>#</th>
            <th className={cn(cell, "text-left font-semibold")}>Désignation</th>
            <th className={cn(cell, "w-10 text-right font-semibold")}>Qté</th>
            <th className={cn(cell, "w-16 text-right font-semibold")}>P.U. HT</th>
            <th className={cn(cell, "w-20 text-right font-semibold")}>Total HT</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className={cn(cell, "text-center italic text-[#94A3B8]")}>
                Aucune ligne.
              </td>
            </tr>
          )}
          {items.map((it, i) => {
            const lineTotal = it.quantity * it.unitPrice;
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
                <td className={cn(cell, "align-top text-[#64748B]")}>
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className={cn(cell, "align-top leading-snug")}>{it.description}</td>
                <td className={cn(cell, "text-right align-top font-mono")}>{it.quantity}</td>
                <td className={cn(cell, "text-right align-top font-mono")}>
                  {number(it.unitPrice)}
                </td>
                <td className={cn(cell, "text-right align-top font-mono font-semibold")}>
                  {number(lineTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (!hasSections) {
    return (
      <div className={cn(compact ? "mt-2" : "mt-4")}>
        {renderLinesTable(doc.items)}
      </div>
    );
  }

  const unsectioned = doc.items.filter((it) => !it.sectionId);

  return (
    <div className={cn("space-y-3", compact ? "mt-2" : "mt-4")}>
      {sections.map((sec) => {
        const items = doc.items.filter((it) => it.sectionId === sec.id);
        return (
          <div
            key={sec.id}
            className={
              referenceDesign ? "overflow-hidden" : "overflow-hidden rounded-lg ring-1 ring-[#E2E8F0]"
            }
          >
            <div
              className={cn(
                "text-center font-bold uppercase tracking-wider text-white",
                compact ? "px-2 py-1.5 text-[9px]" : "px-2.5 py-2 text-[11px]",
              )}
              style={headerStyle}
            >
              Prestation(s)
            </div>
            <div
              className={cn(
                "text-center font-semibold uppercase tracking-wide text-[#0F172A]",
                compact ? "px-2 py-1.5 text-[11px]" : "px-2.5 py-2 text-[13px]",
              )}
              style={{ background: referenceDesign ? REF.sectionBg : "#EFF6FF" }}
            >
              {(sec.title.trim() || "—").toUpperCase()}
            </div>
            {renderLinesTable(items, `${sec.id}-`, false)}
          </div>
        );
      })}
      {unsectioned.length > 0 ? renderLinesTable(unsectioned, "loose-") : null}
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
}: {
  doc: Document;
  accent: string;
  compact?: boolean;
  referenceDesign?: boolean;
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
  });

  const grossSubtotal = computed.grossSubtotal || doc.subtotal;
  const discountAmount = computed.discountAmount;
  const subtotal = computed.subtotal || doc.subtotal;
  const tps = tpsActive ? Math.max(computed.tps, doc.tps ?? 0) : 0;
  const css = computed.css || doc.css || 0;
  const vat = tpsActive ? 0 : (computed.vat || doc.vat || 0);
  /** TPS déduite ; CSS / TVA ajoutées. */
  const total = tpsActive
    ? Math.max(0, subtotal - tps + css)
    : doc.total || computed.total;

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
        />
        {discountAmount > 0 ? (
          <AmountRow
            label={`Remise (${discountPct} %)`}
            value={number(-discountAmount)}
            currency={doc.currency}
            accent={accent}
            compact={compact}
            variant={amountVariant}
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
          />
        ) : null}
        <AmountRow
          label={`CSS (${cssRate} %)`}
          value={number(css)}
          currency={doc.currency}
          accent={accent}
          compact={compact}
          variant={amountVariant}
        />
        {!tpsActive ? (
          <AmountRow
            label={`TVA (${vatRate} %)`}
            value={number(vat)}
            currency={doc.currency}
            accent={accent}
            compact={compact}
            variant={amountVariant}
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
        />
      </div>
    </div>
  );
}

export { ItemsTable, PartyBlock, StampBox, TotalsBlock, partyAddressLines, partyContactLine };
