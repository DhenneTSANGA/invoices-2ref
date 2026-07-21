import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { longDate } from "@/lib/format";
import { LegalFooter, PreviewLogo, PreviewShell } from "./PreviewShell";

type Props = { doc: Document; compact?: boolean; variant?: "full" | "thumb"; className?: string };

const ACCENT = "#B45309";
const ACCENT_TO = "#D97706";

export const LetterPreview = forwardRef<HTMLDivElement, Props>(function LetterPreview(
  { doc, compact, variant = "full", className },
  ref,
) {
  const { company, client } = usePreviewData(doc);
  const isThumb = variant === "thumb";

  const recipient =
    doc.recipientOverride ||
    (client
      ? `${client.contactName}\n${client.name}\n${client.address}\n${client.city}, ${client.country}`
      : "Destinataire à renseigner");

  const body =
    doc.body ||
    "Nous vous adressons la présente afin de vous faire part de notre communication professionnelle.\n\nNous restons à votre disposition pour tout complément d'information.\n\nDans l'attente de votre retour, nous vous prions d'agréer l'expression de nos salutations distinguées.";

  return (
    <PreviewShell innerRef={ref} accent={ACCENT} compact={compact} isThumb={isThumb} className={className}>
      <div className="flex items-start justify-between border-b border-[#FDE68A] pb-5">
        <div className="flex items-center gap-3">
          <PreviewLogo />
          <div>
            <div className="font-display text-lg font-bold tracking-tight" style={{ color: ACCENT }}>{company.name}</div>
            <div className="text-[10px] text-[#64748B]">{company.address}</div>
            <div className="text-[10px] text-[#64748B]">{company.city}</div>
            <div className="text-[10px] text-[#64748B]">{company.phone} · {company.email}</div>
          </div>
        </div>
        <div className="text-right text-[10px] text-[#64748B]">
          <div>NIF {company.nif}</div>
          <div>RCCM {company.rccm}</div>
          <div className="mt-2 font-medium text-[#0F172A]">{company.city.split(",")[0]}, le {longDate(doc.issueDate)}</div>
        </div>
      </div>

      <div className="mt-8 ml-auto max-w-[280px] whitespace-pre-line text-[11px] leading-relaxed text-[#334155]">
        {recipient}
      </div>

      <div className="mt-8 text-[11px]">
        <span className="font-semibold text-[#B45309]">Objet : </span>
        <span className="font-medium text-[#0F172A]">{doc.subject || "Courrier commercial"}</span>
      </div>
      {doc.number && (
        <div className="mt-1 text-[10px] text-[#64748B]">Réf. {doc.number}</div>
      )}

      <div className="mt-6 text-[12px] text-[#0F172A]">
        {doc.salutation || "Madame, Monsieur,"}
      </div>

      <div className="mt-4 whitespace-pre-line text-[11.5px] leading-7 text-[#334155]">
        {body}
      </div>

      <div className="mt-8 text-[11.5px] leading-relaxed text-[#334155]">
        {doc.closing ||
          "Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées."}
      </div>

      <div className="mt-10 flex justify-end">
        <div className="w-48 text-center">
          <div className="text-[11px] font-semibold text-[#0F172A]">Mireille Ndong</div>
          <div className="text-[10px] text-[#B45309]">{doc.signatoryTitle || "Expert-comptable"}</div>
          <div className="mx-auto mt-6 flex h-14 w-32 items-center justify-center rounded-full border-2 border-dashed text-[9px] italic" style={{ borderColor: `${ACCENT}66`, color: `${ACCENT}99` }}>
            Cachet
          </div>
        </div>
      </div>

      <LegalFooter {...company} />
    </PreviewShell>
  );
});
