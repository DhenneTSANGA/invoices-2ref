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
  // compact = export PDF : densifié pour tenir sur une page A4
  const fillPage = Boolean(compact);

  return (
    <div
      ref={innerRef}
      data-document-preview
      data-pdf-dense={fillPage ? "true" : undefined}
      className={cn(
        "mx-auto bg-white text-[#0F172A]",
        fillPage
          ? "rounded-none shadow-none ring-0"
          : "shadow-float ring-1 ring-black/5",
        !fillPage && !isThumb && "rounded-2xl",
        isThumb ? "w-[820px] max-w-none overflow-hidden rounded-xl" : "w-full max-w-[820px]",
        className,
      )}
      style={{
        ["--preview-accent" as string]: accent,
        ...(fillPage
          ? { minHeight: A4_MIN_HEIGHT }
          : !isThumb
            ? { minHeight: A4_MIN_HEIGHT }
            : undefined),
      }}
    >
      <div
        className={cn(
          "flex flex-col",
          fillPage
            ? "min-h-[inherit] gap-0 p-4 pb-2.5 text-[12.5px] leading-snug"
            : "min-h-full p-7 pb-5 text-[14px] leading-relaxed",
        )}
        style={
          fillPage || !isThumb
            ? { minHeight: A4_MIN_HEIGHT }
            : undefined
        }
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

/** Rangée bas de document : contenu gauche + totaux collés à droite (fiable PDF). */
export function PreviewBottomRow({
  left,
  right,
  compact,
}: {
  left: ReactNode;
  right: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn("flex items-start", compact ? "mt-2.5 gap-3" : "mt-4 gap-6")}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: compact ? "12px" : "24px",
      }}
    >
      <div className="min-w-0 flex-1" style={{ flex: "1 1 0%", minWidth: 0 }}>
        {left}
      </div>
      <div
        className="shrink-0"
        style={{
          flex: compact ? "0 0 240px" : "0 0 280px",
          width: compact ? 240 : 280,
          maxWidth: compact ? 240 : 280,
        }}
      >
        {right}
      </div>
    </div>
  );
}
