import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import { LOGO_SRC } from "@/components/common/Logo";

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
  return (
    <div
      ref={innerRef}
      data-document-preview
      className={cn(
        "mx-auto bg-white text-[#0F172A] shadow-float ring-1 ring-black/5",
        compact || isThumb ? "" : "aspect-[1/1.414]",
        isThumb ? "w-[820px] max-w-none rounded-xl" : "w-full max-w-[820px] overflow-hidden rounded-2xl",
        className,
      )}
      style={{ ["--preview-accent" as string]: accent }}
    >
      <div className={cn("flex h-full flex-col p-8 text-[12px] leading-relaxed", isThumb && "p-8")}>
        {children}
      </div>
    </div>
  );
}

export function PreviewLogo({ className }: { className?: string }) {
  return (
    <img
      src={LOGO_SRC}
      alt="2R Expertise Fiscale"
      className={cn("h-14 w-auto shrink-0 object-contain", className)}
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
      className="flex items-center justify-between px-3 py-2 text-[11px]"
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
    `${address}, ${city}`,
    nif && `NIF ${nif}`,
    niu && niu !== "—" && `NIU ${niu}`,
    rccm && `RCCM ${rccm}`,
    cnss && `CNSS ${cnss}`,
  ].filter(Boolean);

  return (
    <div className="mt-auto border-t border-[#E2E8F0] pt-3 text-center text-[9px] text-[#64748B]">
      {legalParts.join(" · ")}
      <br />
      {[phone, email, website].filter(Boolean).join(" · ")}
      <br />
      <span className="text-[8px]">Document conforme aux usages OHADA / zone CEMAC — montants en Francs CFA (XAF)</span>
    </div>
  );
}
