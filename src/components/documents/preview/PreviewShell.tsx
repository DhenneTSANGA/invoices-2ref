import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import { CABINET_LOGOS, CABINET_LABELS, type Cabinet } from "@/lib/cabinets";
import { amountInWords } from "@/lib/format";

const PREVIEW_WIDTH = 820;
/** Hauteur A4 proportionnelle à 820px de large — ancre le pied de page en bas. */
export const A4_MIN_HEIGHT = Math.round(PREVIEW_WIDTH * 1.414213562);

type ShellProps = {
  children: ReactNode;
  className?: string;
  accent?: string;
  compact?: boolean;
  isThumb?: boolean;
  innerRef?: Ref<HTMLDivElement>;
};

export function PreviewShell({
  children,
  className,
  accent = "#01004C",
  compact,
  isThumb,
  innerRef,
}: ShellProps) {
  // compact = export PDF : même typo/paddings que l’aperçu, sans ombre ni coins
  const forPdf = Boolean(compact);

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
        className="flex min-h-full flex-col p-7 pb-5 text-[14px] leading-relaxed"
        style={{ minHeight: !isThumb ? A4_MIN_HEIGHT : undefined }}
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
}: {
  cabinet?: Cabinet;
  className?: string;
  compact?: boolean;
}) {
  return (
    <img
      src={CABINET_LOGOS[cabinet]}
      alt={CABINET_LABELS[cabinet]}
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
      decoding="sync"
      className={cn(
        "w-auto shrink-0 object-contain",
        compact ? "h-16" : "h-32",
        className,
      )}
    />
  );
}

export function AmountRow({
  label,
  value,
  currency,
  strong,
  accent = "#01004C",
  compact,
}: {
  label: string;
  value: string;
  currency: string;
  strong?: boolean;
  accent?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        compact ? "px-2.5 py-1.5 text-[11px]" : "px-3.5 py-2.5 text-[13px]",
      )}
      style={strong ? { background: `linear-gradient(90deg, ${accent}, ${accent}cc)`, color: "#fff" } : { background: "#fff" }}
    >
      <span className={strong ? "font-bold uppercase tracking-wide" : "text-[#475569]"}>{label}</span>
      <span className={`font-mono ${strong ? "font-bold" : "font-semibold text-[#0F172A]"}`}>
        {value} {currency}
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
  niuLabel = "NIU",
  compact,
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
  /** Libellé de l’identifiant stocké dans `niu` (ex. STAT pour 2R Conseil). */
  niuLabel?: string;
  compact?: boolean;
}) {
  const legalParts = [
    name,
    [address, city].filter(Boolean).join(", "),
    nif && nif !== "—" && `NIF ${nif}`,
    niu && niu !== "—" && `${niuLabel} ${niu}`,
    rccm && rccm !== "—" && `RCCM ${rccm}`,
    cnss && `CNSS ${cnss}`,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "mt-auto shrink-0 border-t border-[#E2E8F0] text-center leading-snug text-[#64748B]",
        compact ? "pt-2 text-[9px]" : "pt-3.5 text-[11px]",
      )}
    >
      {legalParts.join(" · ")}
      <br />
      {[phone, email, website].filter(Boolean).join(" · ")}
      <br />
      <span className={compact ? "text-[8px]" : "text-[10px]"}>
        Document conforme aux usages OHADA / zone CEMAC — montants en Francs CFA (XAF)
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
}: {
  amount: number;
  currency?: string;
  accent?: string;
  compact?: boolean;
}) {
  const words = amountInWords(amount, currency);
  return (
    <div
      className={cn(
        "rounded-lg border text-center",
        compact ? "px-2.5 py-1.5" : "px-3 py-2.5",
      )}
      style={{ borderColor: `${accent}33`, background: `${accent}08` }}
    >
      <div className={cn("text-[#64748B]", compact ? "text-[11px]" : "text-[13px]")}>
        Arrêté à la somme de
      </div>
      <p
        className={cn(
          "break-words font-bold leading-snug text-[#0F172A]",
          compact ? "mt-1 text-[12px]" : "mt-1.5 text-[15px]",
        )}
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
  compact: _compact,
}: {
  left: ReactNode;
  right: ReactNode;
  compact?: boolean;
}) {
  return (
    <table
      className="mt-4 w-full border-collapse"
      style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
    >
      <tbody>
        <tr>
          <td
            style={{
              width: "58%",
              verticalAlign: "top",
              paddingRight: "20px",
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
