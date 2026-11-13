import { forwardRef, type CSSProperties } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { longDate } from "@/lib/format";
import { DOCUMENT_COLORS, COMPANY_DEFAULTS, type Cabinet } from "@/lib/cabinets";
import { PreviewLogo, PreviewShell } from "./PreviewShell";
import { clientLetterRecipientLines } from "@/lib/client-address";
import { cn } from "@/lib/utils";
import { resolveSignatoryRole } from "@/lib/signatory";
import { isRichTextEmpty, looksLikeHtml, plainTextToHtml } from "@/lib/rich-text";
import { letterPlaceCityLabel } from "@/lib/letter-place-city";

/**
 * Courrier — gabarit du modèle Word « COURRIER FGIS » :
 * Times New Roman 12 pt, interligne simple (1.0), bloc « À l'attention de » en 11 pt gras,
 * signature (nom / espace signature / qualité) à droite, pied de page Calibri Light bleu.
 */

/** 820 px = 210 mm → 1 pt = 820 / 595,28 px. */
const PT = 820 / 595.28;
const pt = (n: number) => `${(n * PT).toFixed(2)}px`;

/**
 * Interligne Word « simple » (1,0) : hauteur = métriques de la police.
 * Times New Roman : (winAscent 1825 + winDescent 443) / 2048 ≈ 1,107.
 */
const LINE = 1.107;
/** Interligne simple (1,0) de Calibri / Calibri Light : (1950 + 550) / 2048 ≈ 1,22. */
const FOOTER_LINE = 1.22;
/** Ligne vide Word (paragraphe vide 12 pt) entre deux blocs. */
const BLANK = `${(12 * LINE * (820 / 595.28)).toFixed(2)}px`;

const LETTER_FONT = '"Times New Roman", Times, "Liberation Serif", serif';
const FOOTER_FONT = '"Calibri Light", Calibri, Carlito, "Segoe UI", Arial, sans-serif';
const FOOTER_COLOR = "#365F91";
const TEXT_COLOR = "#000000";

/** Marges du modèle : 2,5 cm. */
const MARGIN_MM = 25;
/** Pied de page à ~28 cm du haut de page (modèle). */
const BOTTOM_MM = 8;

/** 1 cm en px d'aperçu (820 px = 21 cm). */
const CM = 820 / 21;
const MARGIN_PX = MARGIN_MM / 10 * CM;
/** Dessin du logo : ~4,5 × 2,3 cm, haut à 0,8 cm du bord, 0,35 cm après la marge gauche. */
const LOGO_ARTWORK_HEIGHT = Math.round(2.3 * CM);
const LOGO_TOP = 0.8 * CM;
const LOGO_LEFT = Math.round(0.35 * CM);
/** Date à ~3,85 cm du haut de page, sous le logo. */
const DATE_TOP = 3.85 * CM;
/** REF à ~7,9 cm du haut de page (bloc destinataire de 5 lignes). */
const HEADER_MIN_HEIGHT = Math.round((7.9 - MARGIN_MM / 10) * CM);

/** Espace signature : ~4 lignes vides 11 pt du modèle (+ marge). */
const SIGNATURE_GAP = 92;
/** Hauteur de l'image signature / cachet (déborde de l'espace, centrée). */
const STAMP_HEIGHT = 140;

/** Activité affichée au pied de page (champ absent des paramètres société). */
const LETTER_ACTIVITY: Record<Cabinet, string | null> = {
  conseil: "Conseil - Audit - Formation",
  expertise_fiscale: null,
};

type Props = {
  doc: Document;
  compact?: boolean;
  variant?: "full" | "thumb";
  className?: string;
  omitSignature?: boolean;
};

function RichHtml({
  html,
  className,
  style,
}: {
  html: string;
  className?: string;
  style?: CSSProperties;
}) {
  const content = looksLikeHtml(html) ? html : plainTextToHtml(html);
  return (
    <div
      className={cn(
        // Paragraphes séparés par une ligne vide, comme dans le modèle Word.
        "[&_p]:m-0 [&_p]:mb-[1.107em] [&_p:last-child]:mb-0 [&_p:empty]:hidden",
        "[&_ul]:m-0 [&_ul]:mb-[1.107em] [&_ul]:list-disc [&_ol]:m-0 [&_ol]:mb-[1.107em] [&_ol]:list-decimal",
        "[&_ul:last-child]:mb-0 [&_ol:last-child]:mb-0 [&_li]:m-0 [&_li_p]:mb-0",
        "[&_strong]:font-bold [&_em]:italic [&_u]:underline",
        className,
      )}
      style={style}
      dangerouslySetInnerHTML={{
        // Retrait des puces du modèle : 1,47 cm (≈ 57 px).
        __html: content.replace(
          /<(ul|ol)(\s|>)/g,
          '<$1 style="padding-left:57px"$2',
        ),
      }}
    />
  );
}

/** « 21 octobre 2026 » → « 21 Octobre 2026 » (mois capitalisé, comme le modèle). */
function letterDate(iso: string): string {
  const [day, month, ...rest] = longDate(iso).split(" ");
  if (!month) return longDate(iso);
  return [day, month.charAt(0).toUpperCase() + month.slice(1), ...rest].join(" ");
}

/** « M. Romaric BOULINGUI » → « Romaric BOULINGUI ». */
function stripCivility(name: string): string {
  return name.replace(/^(M\.|Mr\.?|Mme\.?|Mlle\.?|Monsieur|Madame)\s+/i, "").trim();
}

export const LetterPreview = forwardRef<HTMLDivElement, Props>(function LetterPreview(
  { doc, compact, variant = "full", className, omitSignature },
  ref,
) {
  const { company, client } = usePreviewData(doc);
  const isThumb = variant === "thumb";
  const { accent } = DOCUMENT_COLORS.letter;
  const city = letterPlaceCityLabel(doc.placeCity, company.city);
  const showStamp = doc.status === "signed" || doc.status === "sent";
  const stampUrl = company.stampUrl?.trim() || "";
  const stampVisible = Boolean(showStamp && stampUrl && !omitSignature);

  const isAccountant = resolveSignatoryRole(doc.signatoryTitle) === "comptable";
  const signerName = isAccountant ? "" : stripCivility(company.managerName ?? "");
  const signerTitle = isAccountant
    ? "LE CHEF COMPTABLE"
    : `GÉRANT ${(company.name || "").toUpperCase()}`.trim();

  const recipientLines = doc.recipientOverride
    ? doc.recipientOverride
    : client
      ? clientLetterRecipientLines(client).join("\n")
      : "";

  const body12: CSSProperties = { fontSize: pt(12), lineHeight: LINE, color: TEXT_COLOR };

  const capital = company.capital || COMPANY_DEFAULTS[doc.cabinet]?.capital;
  const activity = LETTER_ACTIVITY[doc.cabinet];
  const address = [company.address, company.city].filter(Boolean).join(", ");
  const has = (v?: string | null) => Boolean(v && v.trim() && v.trim() !== "—");

  return (
    <PreviewShell
      innerRef={ref}
      accent={accent}
      compact={compact}
      isThumb={isThumb}
      className={className}
      pageMarginMm={MARGIN_MM}
      pagePaddingBottomMm={BOTTOM_MM}
      baseTextClass=""
    >
      <div className="flex flex-1 flex-col" style={{ fontFamily: LETTER_FONT, color: TEXT_COLOR }}>
        {/*
          En-tête (mesures du courrier imprimé) : logo seul en haut à gauche,
          puis date + destinataire sous le logo, à droite ; REF à ~7,9 cm du haut de page.
        */}
        <div className="relative" style={{ minHeight: HEADER_MIN_HEIGHT }}>
          <div
            className="absolute"
            style={{ top: LOGO_TOP - MARGIN_PX, left: LOGO_LEFT }}
          >
            <PreviewLogo cabinet={doc.cabinet} artworkHeight={LOGO_ARTWORK_HEIGHT} />
          </div>
          <div
            className="ml-auto flex flex-col"
            style={{ width: 270, paddingTop: DATE_TOP - MARGIN_PX, paddingBottom: BLANK }}
          >
            <div className="w-full text-center italic" style={body12}>
              {city}, le {letterDate(doc.issueDate)}
            </div>
            <div
              className="w-full whitespace-pre-line text-center font-bold"
              style={{ fontSize: pt(11), lineHeight: LINE, color: TEXT_COLOR, marginTop: 6 }}
            >
              {recipientLines || (
                <span className="font-normal italic text-[#94A3B8]">
                  Destinataire à renseigner
                </span>
              )}
            </div>
          </div>
        </div>

        {/* REF / Objet */}
        <div className="text-justify" style={body12}>
          <p className="m-0 font-bold">
            <span className="underline">REF</span> : {doc.number}
          </p>
          <p className="m-0 font-bold" style={{ marginTop: BLANK }}>
            <span className="underline">Objet</span> : {doc.subject?.trim() || "—"}
          </p>
        </div>

        {!isRichTextEmpty(doc.salutation) ? (
          <RichHtml
            html={doc.salutation!.trim()}
            className="font-bold"
            style={{ ...body12, marginTop: BLANK }}
          />
        ) : null}

        <RichHtml
          html={doc.body?.trim() || ""}
          className="text-justify"
          style={{ ...body12, marginTop: BLANK }}
        />

        {!isRichTextEmpty(doc.closing) ? (
          <RichHtml
            html={doc.closing!.trim()}
            className="text-justify"
            style={{ ...body12, marginTop: pt(14) }}
          />
        ) : null}

        {/* Signature : nom en gras, espace signature / cachet, qualité en gras. */}
        <div className="flex justify-end" style={{ marginTop: pt(14) }}>
          <div
            className="whitespace-nowrap text-center font-bold"
            style={{ ...body12, minWidth: 258 }}
          >
            {signerName ? <div>{signerName}</div> : null}
            {/* ~4 lignes vides du modèle ; la signature / cachet déborde comme une image flottante Word. */}
            <div className="relative" style={{ height: SIGNATURE_GAP }}>
              {stampVisible ? (
                <img
                  src={stampUrl}
                  alt={signerName ? `Signature de ${signerName}` : "Signature électronique"}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  decoding="sync"
                  className="absolute left-1/2 max-w-none -translate-x-1/2 object-contain object-center [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
                  style={{
                    height: STAMP_HEIGHT,
                    width: 258,
                    top: (SIGNATURE_GAP - STAMP_HEIGHT) / 2,
                  }}
                />
              ) : !compact && !omitSignature ? (
                <div
                  className="absolute inset-x-0 inset-y-1 flex items-center justify-center rounded-lg border border-dashed text-[12px] font-normal italic text-[#94A3B8]"
                  style={{ borderColor: `${accent}44` }}
                >
                  En attente de signature
                </div>
              ) : null}
            </div>
            <div>{signerTitle}</div>
          </div>
        </div>

        {/* Pied de page — Calibri Light 8 pt, bleu, centré, libellés en gras. */}
        <div
          className="mt-auto pt-6 text-center"
          style={{
            fontFamily: FOOTER_FONT,
            color: FOOTER_COLOR,
            fontSize: pt(8),
            lineHeight: FOOTER_LINE,
            marginLeft: -34,
            marginRight: -34,
          }}
        >
          <p className="m-0 [overflow-wrap:anywhere]">
            {has(capital) ? (
              <>
                <b>Forme Juridique :</b> {capital}
              </>
            ) : null}
            {activity ? (
              <>
                {" – "}
                <b>Activité :</b> {activity}
              </>
            ) : null}
            {has(company.rccm) ? (
              <>
                {" – "}
                <b>RCCM :</b> {company.rccm}
              </>
            ) : null}
            {has(company.nif) ? (
              <>
                {" "}
                <b>NIF :</b> {company.nif}
              </>
            ) : null}
            {address ? (
              <>
                {" – "}
                <b>Adresse :</b> {address}
              </>
            ) : null}
            {has(company.phone) ? (
              <>
                {" – "}
                <span style={{ fontSize: pt(7) }}>
                  <b>Téléphone :</b> {company.phone}
                </span>
              </>
            ) : null}
          </p>
          {has(company.email) || has(company.website) ? (
            <p className="m-0">
              {has(company.email) ? (
                <>
                  <b>E-mail :</b> {company.email}
                </>
              ) : null}
              {has(company.website) ? (
                <>
                  {has(company.email) ? " – " : ""}
                  <b>Site :</b> {company.website}
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    </PreviewShell>
  );
});
