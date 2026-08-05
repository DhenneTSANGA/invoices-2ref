import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { longDate } from "@/lib/format";
import { DOCUMENT_COLORS } from "@/lib/cabinets";
import { LegalFooter, PreviewLogo, PreviewShell } from "./PreviewShell";
import { ManagerSignature } from "@/components/signature/ManagerSignature";
import { clientLetterRecipientLines } from "@/lib/client-address";

type Props = { doc: Document; compact?: boolean; variant?: "full" | "thumb"; className?: string };

export const LetterPreview = forwardRef<HTMLDivElement, Props>(function LetterPreview(
  { doc, compact, variant = "full", className },
  ref,
) {
  const { company, client } = usePreviewData(doc);
  const isThumb = variant === "thumb";
  const { accent, accentTo } = DOCUMENT_COLORS.letter;
  const city = (company.city.split(",")[0] || company.city).trim();
  const showStamp = doc.status === "signed" || doc.status === "sent";
  const managerName = company.managerName?.trim() || "";
  const stampUrl = company.stampUrl?.trim() || "";
  const signatoryTitle = doc.signatoryTitle?.trim() || "Le Gérant";
  const niuLabel = doc.cabinet === "conseil" ? "STAT" : "NIU";

  const recipientLines = doc.recipientOverride
    ? doc.recipientOverride
    : client
      ? clientLetterRecipientLines(client).join("\n")
      : "";

  return (
    <PreviewShell
      innerRef={ref}
      accent={accent}
      compact={compact}
      isThumb={isThumb}
      className={className}
    >
      <div className="flex items-start justify-between gap-4">
        <PreviewLogo cabinet={doc.cabinet} className="h-28" />
        <div className="pt-2 text-right text-[13px] text-[#475569]">
          {city}, le {longDate(doc.issueDate)}.
        </div>
      </div>

      <div className="mt-10 flex justify-end">
        <div
          className="w-[52%] whitespace-pre-line rounded-lg border-2 p-3.5 text-[13.5px] leading-[1.55]"
          style={{ borderColor: `${accent}33` }}
        >
          <div
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: accent }}
          >
            Destinataire
          </div>
          <div className="mt-1.5 text-[#0F172A]">
            {recipientLines || (
              <span className="italic text-[#94A3B8]">Destinataire à renseigner</span>
            )}
          </div>
        </div>
      </div>

      <div
        className="mt-6 rounded-lg p-3.5 text-[13.5px] leading-[1.55]"
        style={{
          background: `linear-gradient(135deg, ${accent}08, ${accentTo}12)`,
        }}
      >
        <div>
          <span className="font-bold" style={{ color: accent }}>
            REF :
          </span>{" "}
          <span className="font-semibold text-[#0F172A]">{doc.number}</span>
        </div>
        <div className="mt-1.5">
          <span className="font-bold" style={{ color: accent }}>
            Objet :
          </span>{" "}
          <span className="text-[#0F172A]">{doc.subject?.trim() || "—"}</span>
        </div>
      </div>

      {doc.salutation?.trim() ? (
        <div className="mt-7 text-[14px] leading-[1.7] text-[#0F172A]">
          {doc.salutation.trim()}
        </div>
      ) : null}

      <div className="mt-4 flex-1 whitespace-pre-line text-[13.5px] leading-[1.75] text-justify text-[#1E293B]">
        {doc.body?.trim() || ""}
      </div>

      {doc.closing?.trim() ? (
        <div className="mt-7 whitespace-pre-line text-[13.5px] leading-[1.7] text-justify text-[#1E293B]">
          {doc.closing.trim()}
        </div>
      ) : null}

      <div className="mt-10 flex justify-end">
        <ManagerSignature
          signatureUrl={stampUrl}
          managerName={managerName}
          signatoryTitle={signatoryTitle}
          applied={showStamp}
          accent={accent}
          compact={isThumb}
        />
      </div>

      <LegalFooter {...company} niuLabel={niuLabel} />
    </PreviewShell>
  );
});
