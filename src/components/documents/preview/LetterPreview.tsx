import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { longDate } from "@/lib/format";
import { DOCUMENT_COLORS } from "@/lib/cabinets";
import { LegalFooter, PreviewLogo, PreviewShell } from "./PreviewShell";
import { ManagerSignature } from "@/components/signature/ManagerSignature";
import { clientLetterRecipientLines } from "@/lib/client-address";
import { cn } from "@/lib/utils";

type Props = {
  doc: Document;
  compact?: boolean;
  variant?: "full" | "thumb";
  className?: string;
  omitSignature?: boolean;
};

export const LetterPreview = forwardRef<HTMLDivElement, Props>(function LetterPreview(
  { doc, compact, variant = "full", className, omitSignature },
  ref,
) {
  const { company, client } = usePreviewData(doc);
  const isThumb = variant === "thumb";
  /** Pas de densification : le PDF doit matcher l’aperçu écran. */
  const dense = false;
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
      <div className={cn("flex items-start justify-between", dense ? "gap-3" : "gap-4")}>
        <div className="shrink-0">
          <PreviewLogo cabinet={doc.cabinet} className="h-40" />
        </div>
        <div className={cn("text-right text-[#475569]", dense ? "pt-1 text-[11px]" : "pt-2 text-[13px]")}>
          {city}, le {longDate(doc.issueDate)}.
        </div>
      </div>

      <div className={cn("flex justify-end", dense ? "mt-5" : "mt-10")}>
        <div
          className={cn(
            "w-[52%] whitespace-pre-line rounded-lg border-2 leading-[1.45]",
            dense ? "p-2.5 text-[12px]" : "p-3.5 text-[13.5px] leading-[1.55]",
          )}
          style={{ borderColor: `${accent}33` }}
        >
          <div
            className={cn("font-bold uppercase tracking-wider", dense ? "text-[9px]" : "text-[11px]")}
            style={{ color: accent }}
          >
            Destinataire
          </div>
          <div className={cn("text-[#0F172A]", dense ? "mt-1" : "mt-1.5")}>
            {recipientLines || (
              <span className="italic text-[#94A3B8]">Destinataire à renseigner</span>
            )}
          </div>
        </div>
      </div>

      <div
        className={cn("rounded-lg leading-[1.45]", dense ? "mt-3 p-2.5 text-[12px]" : "mt-6 p-3.5 text-[13.5px] leading-[1.55]")}
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
        <div className={dense ? "mt-1" : "mt-1.5"}>
          <span className="font-bold" style={{ color: accent }}>
            Objet :
          </span>{" "}
          <span className="text-[#0F172A]">{doc.subject?.trim() || "—"}</span>
        </div>
      </div>

      {doc.salutation?.trim() ? (
        <div className={cn("text-[#0F172A]", dense ? "mt-4 text-[12.5px] leading-[1.55]" : "mt-7 text-[14px] leading-[1.7]")}>
          {doc.salutation.trim()}
        </div>
      ) : null}

      <div
        className={cn(
          "flex-1 whitespace-pre-line text-justify text-[#1E293B]",
          dense ? "mt-2.5 text-[12px] leading-[1.55]" : "mt-4 text-[13.5px] leading-[1.75]",
        )}
      >
        {doc.body?.trim() || ""}
      </div>

      {doc.closing?.trim() ? (
        <div
          className={cn(
            "whitespace-pre-line text-justify text-[#1E293B]",
            dense ? "mt-4 text-[12px] leading-[1.55]" : "mt-7 text-[13.5px] leading-[1.7]",
          )}
        >
          {doc.closing.trim()}
        </div>
      ) : null}

      <div className={cn("flex justify-end", dense ? "mt-5" : "mt-10")}>
        <ManagerSignature
          signatureUrl={stampUrl}
          managerName={managerName}
          signatoryTitle={signatoryTitle}
          applied={showStamp}
          accent={accent}
          compact={isThumb}
          forPdf={compact}
          omitStamp={omitSignature}
        />
      </div>

      <LegalFooter
        name={company.name}
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
