import type { ReactNode, Ref, SyntheticEvent } from "react";
import { cn } from "@/lib/utils";
import {
  CABINET_LOGOS,
  CABINET_LABELS,
  CABINET_LOGO_BOUNDS,
  CONSEIL_CLOSING,
  CONSEIL_BAR_FILL,
  CONSEIL_PAPER_COLORS,
  type Cabinet,
} from "@/lib/cabinets";
import { amountInWords } from "@/lib/format";

const PREVIEW_WIDTH = 820;
/** Hauteur A4 (297/210) à 820px de large — ancre le pied de page en bas. */
export const A4_MIN_HEIGHT = Math.round(PREVIEW_WIDTH * (297 / 210));
/** Marge papier comme la facture imprimée de référence (~18 mm). */
const PAGE_MARGIN_MM = 18;
/** Factures / devis : marge un peu plus serrée pour tenir sur une page. */
const DOC_PAGE_MARGIN_MM = 16;

function pagePaddingPx(marginMm: number) {
  return Math.round((PREVIEW_WIDTH * marginMm) / 210);
}

/**
 * Échelle typographique facture / devis : deux niveaux seulement.
 * `small` (11) = tout texte courant ; `base` (13) = texte en gras / mis en avant.
 * Les grands titres (FACTURE / DEVIS) restent hors échelle.
 */
export const DOC_TEXT = {
  small: "text-[11px]",
  base: "text-[13px]",
} as const;

/** Police unique du papier (texte et chiffres). */
export const TIMES_NUMERALS = 'Georgia, "Times New Roman", serif';

export function TimesNum({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={className} style={{ fontFamily: TIMES_NUMERALS }}>
      {children}
    </span>
  );
}

/** Passe les suites de chiffres en Georgia. */
export function timesDigits(text: string): ReactNode {
  const parts = String(text).split(/(\d[\d\s\u00A0.'’.,/-]*)/g);
  if (parts.length <= 1) return text;
  return parts.map((part, i) =>
    /^\d/.test(part) ? (
      <span key={i} style={{ fontFamily: TIMES_NUMERALS }}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export { CONSEIL_CLOSING };
export const DOC_SHELL = {
  baseTextClass: DOC_TEXT.small,
  pageMarginMm: DOC_PAGE_MARGIN_MM,
} as const;

type ShellProps = {
  children: ReactNode;
  className?: string;
  accent?: string;
  compact?: boolean;
  isThumb?: boolean;
  innerRef?: Ref<HTMLDivElement>;
  /** Taille de texte héritée par le contenu (facture / devis : DOC_TEXT.base). */
  baseTextClass?: string;
  /** Marge papier en mm (facture / devis : 16, courrier : 18). */
  pageMarginMm?: number;
  /** Marge bas en mm — plus petite pour loger les formules sans réduire la signature. */
  pagePaddingBottomMm?: number;
};

export function PreviewShell({
  children,
  className,
  accent = "#01004C",
  compact,
  isThumb,
  innerRef,
  baseTextClass = "text-[14px]",
  pageMarginMm = PAGE_MARGIN_MM,
  pagePaddingBottomMm,
}: ShellProps) {
  // compact = export PDF : même typo/paddings que l’aperçu, sans ombre ni coins
  const forPdf = Boolean(compact);
  const padX = pagePaddingPx(pageMarginMm);
  const padBottom = pagePaddingPx(pagePaddingBottomMm ?? pageMarginMm);

  return (
    <div
      ref={innerRef}
      data-document-preview
      className={cn(
        "mx-auto bg-white text-[#0F172A]",
        forPdf
          ? "rounded-none shadow-none ring-0"
          : "shadow-float ring-1 ring-black/5",
        !forPdf && !isThumb && "rounded-2xl",
        isThumb ? "w-[820px] max-w-none overflow-hidden rounded-xl" : "w-full max-w-[820px]",
        className,
      )}
      style={{
        ["--preview-accent" as string]: accent,
        width: forPdf ? PREVIEW_WIDTH : undefined,
        maxWidth: forPdf ? PREVIEW_WIDTH : undefined,
        minHeight: !isThumb ? A4_MIN_HEIGHT : undefined,
      }}
    >
      <div
        className={cn("flex min-h-full flex-col leading-relaxed", baseTextClass)}
        style={{
          fontFamily: TIMES_NUMERALS,
          minHeight: !isThumb ? A4_MIN_HEIGHT : undefined,
          padding: `${padX}px ${padX}px ${padBottom}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function PreviewLogo({
  cabinet = "expertise_fiscale",
  className,
  compact,
  artworkHeight,
}: {
  cabinet?: Cabinet;
  className?: string;
  compact?: boolean;
  /**
   * Hauteur visible du dessin en px, marges transparentes du fichier rognées.
   * Sans cette prop, le logo est affiché tel quel (canvas complet).
   */
  artworkHeight?: number;
}) {
  const safeCabinet: Cabinet =
    cabinet === "conseil" || cabinet === "expertise_fiscale"
      ? cabinet
      : "expertise_fiscale";
  const primarySrc = CABINET_LOGOS[safeCabinet];
  const fallbackSrc =
    safeCabinet === "conseil"
      ? CABINET_LOGOS.expertise_fiscale
      : CABINET_LOGOS.conseil;
  const heightClass = compact ? "h-20" : "h-40";

  const onError = (e: SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    if (el.dataset.fallback === "1") return;
    el.dataset.fallback = "1";
    el.src = fallbackSrc;
  };

  if (artworkHeight) {
    const box = CABINET_LOGO_BOUNDS[safeCabinet];
    const scale = artworkHeight / box.height;

    return (
      <div
        className={cn("relative shrink-0 overflow-hidden", className)}
        style={{ width: Math.round(box.width * scale), height: Math.round(artworkHeight) }}
      >
        <img
          src={primarySrc}
          alt={CABINET_LABELS[safeCabinet]}
          decoding="async"
          onError={onError}
          className="absolute block max-w-none"
          style={{
            left: -Math.round(box.left * scale),
            top: -Math.round(box.top * scale),
            width: Math.round(box.canvasWidth * scale),
            height: Math.round(box.canvasHeight * scale),
          }}
        />
      </div>
    );
  }

  return (
    <img
      src={primarySrc}
      alt={CABINET_LABELS[safeCabinet]}
      // crossOrigin seulement utile pour captures PDF d’URLs absolues ;
      // sur /public local, il peut empêcher l’affichage du logo.
      decoding="async"
      onError={onError}
      className={cn(
        "block w-auto max-w-[240px] shrink-0 object-contain",
        heightClass,
        className,
      )}
    />
  );
}

export function AmountRow({
  label,
  value,
  strong,
  accent = "#01004C",
  compact,
  variant = "default",
  tint = CONSEIL_PAPER_COLORS.sectionBg,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: string;
  compact?: boolean;
  /** Style facture papier 2R Conseil (barres pleines, fond teinté). */
  variant?: "default" | "reference";
  /** Fond des lignes intermédiaires en style référence. */
  tint?: string;
}) {
  const isRef = variant === "reference";
  const rowBg = strong
    ? isRef
      ? { background: CONSEIL_BAR_FILL, color: "#fff" }
      : { background: accent, color: "#fff" }
    : isRef
      ? { background: tint, color: "#0F172A" }
      : { background: "#fff" };

  return (
    <div
      className={cn(
        "flex items-center justify-between",
        compact ? "px-2.5 py-1.5" : "px-3 py-2",
        isRef && !strong && "border-b border-white/80 last:border-b-0",
      )}
      style={rowBg}
    >
      <span
        className={cn(
          strong
            ? cn("font-bold uppercase tracking-wide", DOC_TEXT.base)
            : isRef
              ? cn("font-semibold text-[#334155]", DOC_TEXT.base)
              : cn("text-[#475569]", DOC_TEXT.small),
        )}
      >
        {isRef ? timesDigits(label) : label}
      </span>
      <span
        className={cn(
          strong ? "font-bold" : "font-semibold text-[#0F172A]",
          DOC_TEXT.base,
        )}
        style={{ fontFamily: TIMES_NUMERALS, letterSpacing: isRef ? "0.04em" : undefined }}
      >
        {value}
      </span>
    </div>
  );
}

export function LegalFooter({
  name,
  address,
  city,
  nif,
  niu,
  rccm,
  cnss,
  phone,
  email,
  website,
  capital,
  niuLabel = "NIU",
  compact,
  className,
  closingThanks,
  thanksColor,
  legalText,
}: {
  name: string;
  address: string;
  city: string;
  nif: string;
  niu: string;
  rccm: string;
  cnss: string;
  phone: string;
  email: string;
  website: string;
  /** Forme / capital social (ex. Entreprise au capital de 1 000 000 FCFA). */
  capital?: string;
  /** Libellé de l’identifiant stocké dans `niu` (ex. STAT pour 2R Conseil). */
  niuLabel?: string;
  compact?: boolean;
  /** Permet aux factures / devis d’imposer l’échelle DOC_TEXT. */
  className?: string;
  /** Formule de politesse centrée, juste au-dessus de la ligne de pied de page. */
  closingThanks?: string;
  thanksColor?: string;
  /** Texte unique de pied (2R Conseil) : justifié, dernière ligne centrée. */
  legalText?: string;
}) {
  const legalParts = [
    name,
    capital?.trim(),
    [address, city].filter(Boolean).join(", "),
    nif && nif !== "—" && `NIF ${nif}`,
    niu && niu !== "—" && `${niuLabel} ${niu}`,
    rccm && rccm !== "—" && `RCCM ${rccm}`,
    cnss && `CNSS ${cnss}`,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "mt-auto shrink-0 text-center leading-tight text-[#64748B]",
        compact ? "text-[8px]" : "text-[10px]",
        className,
      )}
    >
      {closingThanks ? (
        <div
          className="mb-2.5 w-full text-center text-[12px] font-bold italic leading-[1.35]"
          style={{
            fontFamily: TIMES_NUMERALS,
            color: thanksColor || CONSEIL_PAPER_COLORS.accent,
          }}
        >
          {closingThanks}
        </div>
      ) : null}
      <div className="border-t border-[#E2E8F0] pt-2">
        {legalText ? (
          <p
            className="px-0.5 leading-snug [overflow-wrap:anywhere] [text-align-last:center]"
            style={{ textAlign: "justify" }}
          >
            {timesDigits(legalText)}
          </p>
        ) : (
          <>
            <div className="px-0.5 leading-snug [overflow-wrap:anywhere]">
              {legalParts.join(" · ")}
            </div>
            <div className="px-0.5 leading-snug [overflow-wrap:anywhere]">
              {[phone, email, website].filter(Boolean).join(" · ")}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Id du client sous la date (facture / devis). */
export function DocumentClientRef({
  clientRef,
  className,
  timesNumerals,
  color,
}: {
  clientRef?: string | null;
  className?: string;
  timesNumerals?: boolean;
  /** Couleur du libellé et de la valeur (ex. bleu titre facture). */
  color?: string;
}) {
  const value = clientRef?.trim();
  if (!value) return null;

  return (
    <div
      className={cn("leading-[1.2]", DOC_TEXT.small, className)}
      style={color ? { color } : undefined}
    >
      <span className={color ? undefined : "text-[#64748B]"}>ID du client : </span>
      <span
        className={cn("font-semibold", !color && "text-[#0F172A]")}
        style={timesNumerals ? { fontFamily: TIMES_NUMERALS } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

/** Montant total TTC exprimé en lettres — sous les totaux. */
export function AmountInWords({
  amount,
  currency = "XAF",
  accent = "#01004C",
  compact,
  intro = "Arrêtée la présente facture à la somme de",
  variant = "default",
  prominent,
}: {
  amount: number;
  currency?: string;
  accent?: string;
  compact?: boolean;
  intro?: string;
  variant?: "default" | "reference";
  /** Phrase plus grande ; seul le montant en lettres est en gras. */
  prominent?: boolean;
}) {
  const words = amountInWords(amount, currency);
  const isRef = variant === "reference";
  const wordsFace = { fontFamily: TIMES_NUMERALS };

  if (isRef) {
    return (
      <div className={cn("text-center", compact ? "px-1 py-1" : "px-2 py-1.5")}>
        <p
          className={cn(
            "break-words leading-snug",
            prominent
              ? "text-[14px] text-[#0F172A]"
              : cn("text-[#334155]", DOC_TEXT.small),
          )}
          style={wordsFace}
        >
          {intro}{" "}
          {prominent ? (
            <span className="font-bold">{words}</span>
          ) : (
            <span className={cn("font-semibold text-[#0F172A]", DOC_TEXT.base)}>
              {words}
            </span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border text-center",
        compact ? "px-2.5 py-1.5" : "px-3 py-1.5",
      )}
      style={{ borderColor: `${accent}33`, background: `${accent}08` }}
    >
      <div
        className={cn(
          "text-[#64748B]",
          prominent ? "text-[14px] text-[#0F172A]" : cn("whitespace-nowrap", DOC_TEXT.small),
        )}
        style={wordsFace}
      >
        {intro}
      </div>
      <p
        className={cn(
          "break-words font-bold leading-snug text-[#0F172A]",
          compact ? "mt-0.5" : "mt-1",
          prominent ? "text-[14px]" : DOC_TEXT.base,
        )}
        style={wordsFace}
      >
        {words}
      </p>
    </div>
  );
}

/** Rangée bas de document : RIB / conditions + totaux (table = layout stable en capture PDF). */
export function PreviewBottomRow({
  left,
  right,
  compact,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <table
      className={cn("w-full border-collapse", compact ? "mt-2" : "mt-4", className)}
      style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
    >
      <tbody>
        <tr>
          <td
            style={{
              width: "58%",
              verticalAlign: "top",
              paddingRight: compact ? "12px" : "12px",
            }}
          >
            {left}
          </td>
          <td style={{ width: "42%", verticalAlign: "top" }}>{right}</td>
        </tr>
      </tbody>
    </table>
  );
}
