import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { longDate } from "@/lib/format";
import { DOCUMENT_COLORS, niuLabelForCabinet, COMPANY_DEFAULTS } from "@/lib/cabinets";
import { LegalFooter, PreviewLogo, PreviewShell } from "./PreviewShell";
import { ManagerSignature } from "@/components/signature/ManagerSignature";
import { clientLetterRecipientLines } from "@/lib/client-address";
import { cn } from "@/lib/utils";
import {
  isAccountantSignatory,
  signatoryDisplayName,
} from "@/lib/signatory";
import { isRichTextEmpty, looksLikeHtml, plainTextToHtml } from "@/lib/rich-text";
import { letterPlaceCityLabel } from "@/lib/letter-place-city";

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
}: {
  html: string;
  className?: string;
}) {
  const content = looksLikeHtml(html) ? html : plainTextToHtml(html);
  return (
    <div
      className={cn(
        "[&_p]:my-1 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_strong]:font-semibold [&_em]:italic [&_u]:underline",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export const LetterPreview = forwardRef<HTMLDivElement, Props>(function LetterPreview(
  { doc, compact, variant = "full", className, omitSignature },
  ref,
) {
  const { company, client } = usePreviewData(doc);
  const isThumb = variant === "thumb";
  /** Pas de densification : le PDF doit matcher l’aperçu écran. */
  const dense = false;
  const { accent, accentTo } = DOCUMENT_COLORS.letter;
  const city = letterPlaceCityLabel(doc.placeCity, company.city);
  const accountantSignatory = isAccountantSignatory(doc.signatoryTitle);
  const signatoryName = signatoryDisplayName(doc.signatoryTitle);
  const showStamp =
    !accountantSignatory &&
    (doc.status === "signed" || doc.status === "sent");
  const stampUrl = company.stampUrl?.trim() || "";
  const niuLabel = niuLabelForCabinet(doc.cabinet);

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
      <div className={cn("flex items-center justify-between", dense ? "gap-3" : "gap-4")}>
        <div className="shrink-0">
          <PreviewLogo cabinet={doc.cabinet} className="h-40" />
        </div>
        <div className={cn("text-right text-[#475569]", dense ? "text-[11px]" : "text-[13px]")}>
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

      {!isRichTextEmpty(doc.salutation) ? (
        <RichHtml
          html={doc.salutation!.trim()}
          className={cn(
            "text-[#0F172A]",
            dense ? "mt-4 text-[12.5px] leading-[1.55]" : "mt-7 text-[14px] leading-[1.7]",
          )}
        />
      ) : null}

      <RichHtml
        html={doc.body?.trim() || ""}
        className={cn(
          "flex-1 text-justify text-[#1E293B]",
          dense ? "mt-2.5 text-[12px] leading-[1.55]" : "mt-4 text-[13.5px] leading-[1.75]",
        )}
      />

      {!isRichTextEmpty(doc.closing) ? (
        <RichHtml
          html={doc.closing!.trim()}
          className={cn(
            "text-justify text-[#1E293B]",
            dense ? "mt-4 text-[12px] leading-[1.55]" : "mt-7 text-[13.5px] leading-[1.7]",
          )}
        />
      ) : null}

      <div className={cn("flex justify-end", dense ? "mt-5" : "mt-10")}>
        <ManagerSignature
          signatureUrl={stampUrl}
          managerName={signatoryName}
          signatoryTitle={signatoryName}
          applied={showStamp}
          accent={accent}
          compact={isThumb}
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
