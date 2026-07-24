import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import { CABINET_LOGOS, CABINET_LABELS, type Cabinet } from "@/lib/cabinets";
import { amountInWords } from "@/lib/format";

const PREVIEW_WIDTH = 820;
/** Hauteur A4 proportionnelle à 820px de large — ancre le pied de page en bas. */
const A4_MIN_HEIGHT = Math.round(PREVIEW_WIDTH * 1.414213562);

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
  accent = "#1E40AF",
  compact,
  isThumb,
  innerRef,
}: ShellProps) {
  // compact = export PDF : page A4 remplie pour coller le pied en bas
  const fillPage = Boolean(compact);

  return (
    <div
      ref={innerRef}
      data-document-preview
      className={cn(
        "mx-auto bg-white text-[#0F172A]",
        fillPage
          ? "rounded-none shadow-none ring-0"
          : "shadow-float ring-1 ring-black/5",
        !fillPage && !isThumb && "aspect-[1/1.414] overflow-hidden rounded-2xl",
        isThumb ? "w-[820px] max-w-none overflow-hidden rounded-xl" : "w-full max-w-[820px]",
        className,
      )}
      style={{
        ["--preview-accent" as string]: accent,
        ...(fillPage ? { minHeight: A4_MIN_HEIGHT } : undefined),
      }}
    >
      <div
        className={cn(
          "flex flex-col p-7 pb-5 text-[14px] leading-relaxed",
          fillPage ? "min-h-[inherit]" : "h-full",
        )}
        style={fillPage ? { minHeight: A4_MIN_HEIGHT } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

export function PreviewLogo({
  cabinet = "expertise_fiscale",
  className,
}: {
  cabinet?: Cabinet;
  className?: string;
}) {
  return (
    <img
      src={CABINET_LOGOS[cabinet]}
      alt={CABINET_LABELS[cabinet]}
      className={cn("h-16 w-auto shrink-0 object-contain", className)}
    />
  );
}

export function AmountRow({
  label,
  value,
  currency,
  strong,
  accent = "#1E40AF",
}: {
  label: string;
  value: string;
  currency: string;
  strong?: boolean;
  accent?: string;
}) {
  return (
    <div
      className="flex items-center justify-between px-3.5 py-2.5 text-[13px]"
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
}) {
  const legalParts = [
    name,
    [address, city].filter(Boolean).join(", "),
    nif && nif !== "—" && `NIF ${nif}`,
    niu && niu !== "—" && `NIU ${niu}`,
    rccm && rccm !== "—" && `RCCM ${rccm}`,
    cnss && `CNSS ${cnss}`,
  ].filter(Boolean);

  return (
    <div className="mt-auto shrink-0 border-t border-[#E2E8F0] pt-3.5 text-center text-[11px] leading-snug text-[#64748B]">
      {legalParts.join(" · ")}
      <br />
      {[phone, email, website].filter(Boolean).join(" · ")}
      <br />
      <span className="text-[10px]">Document conforme aux usages OHADA / zone CEMAC — montants en Francs CFA (XAF)</span>
    </div>
  );
}

/** Montant total TTC exprimé en lettres — sous les totaux. */
export function AmountInWords({
  amount,
  currency = "XAF",
  accent = "#1E40AF",
}: {
  amount: number;
  currency?: string;
  accent?: string;
}) {
  const words = amountInWords(amount, currency);
  return (
    <div
      className="rounded-lg border px-3 py-2.5"
      style={{ borderColor: `${accent}33`, background: `${accent}08` }}
    >
      <div className="text-[12px] text-[#64748B]">Arrêté à la somme de</div>
      <p className="mt-1 break-words text-[12px] font-bold leading-snug text-[#0F172A]">
        {words}
      </p>
    </div>
  );
}

/** Rangée bas de document : contenu gauche + totaux collés à droite (fiable PDF). */
export function PreviewBottomRow({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div
      className="mt-4 flex items-start gap-6"
      style={{ display: "flex", alignItems: "flex-start", gap: "24px" }}
    >
      <div className="min-w-0 flex-1" style={{ flex: "1 1 0%", minWidth: 0 }}>
        {left}
      </div>
      <div
        className="shrink-0"
        style={{ flex: "0 0 280px", width: 280, maxWidth: 280 }}
      >
        {right}
      </div>
    </div>
  );
}
