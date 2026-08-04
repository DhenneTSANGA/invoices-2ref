import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { longDate } from "@/lib/format";
import { DOCUMENT_COLORS } from "@/lib/cabinets";
import { LegalFooter, PreviewLogo, PreviewShell } from "./PreviewShell";

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
      ? [
          client.contactName ? `À` : "",
          client.contactName || "",
          client.name ? `De ${client.name}` : "",
          [client.address, client.city, client.country].filter(Boolean).join(" — "),
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  return (
    <PreviewShell
      innerRef={ref}
      accent={accent}
      compact={compact}
      isThumb={isThumb}
      className={className}
    >
      {/* En-tête type facture / devis */}
      <div
        className="flex items-start justify-between gap-4 border-b-2 pb-5"
        style={{ borderColor: accent }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <PreviewLogo cabinet={doc.cabinet} className="h-28" />
          <div className="min-w-0">
            <div
              className="font-display text-xl font-bold tracking-tight leading-tight"
              style={{ color: accent }}
            >
              {company.name}
            </div>
            {company.tagline ? (
              <div className="mt-0.5 text-[12px] leading-snug text-[#64748B]">
                {company.tagline}
              </div>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className="font-display text-[28px] font-bold uppercase tracking-wide"
            style={{ color: accent }}
          >
            Courriel
          </div>
          <div className="mt-1 text-[13px] font-semibold">N° {doc.number}</div>
          <div className="text-[12px] text-[#64748B]">{longDate(doc.issueDate)}</div>
        </div>
      </div>

      {/* Lieu + date */}
      <div className="mt-5 text-right text-[13px] text-[#475569]">
        {city}, le {longDate(doc.issueDate)}.
      </div>

      {/* Destinataire */}
      <div className="mt-6 flex justify-end">
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

      {/* REF + Objet */}
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

      {/* Formule d'appel */}
      {doc.salutation?.trim() ? (
        <div className="mt-7 text-[14px] leading-[1.7] text-[#0F172A]">
          {doc.salutation.trim()}
        </div>
      ) : null}

      {/* Corps */}
      <div className="mt-4 flex-1 whitespace-pre-line text-[13.5px] leading-[1.75] text-justify text-[#1E293B]">
        {doc.body?.trim() || ""}
      </div>

      {/* Formule de politesse */}
      {doc.closing?.trim() ? (
        <div className="mt-7 whitespace-pre-line text-[13.5px] leading-[1.7] text-justify text-[#1E293B]">
          {doc.closing.trim()}
        </div>
      ) : null}

      {/* Signature / cachet */}
      <div className="mt-10 flex justify-end">
        <div className="w-64 text-center">
          <div className="text-[13px] font-semibold" style={{ color: accent }}>
            {signatoryTitle}
          </div>

          {showStamp ? (
            <div className="mt-3 flex min-h-[7rem] flex-col items-center justify-center gap-2">
              {stampUrl ? (
                <img
                  src={stampUrl}
                  alt="Cachet"
                  className="max-h-28 max-w-[13rem] object-contain"
                />
              ) : null}
              {managerName ? (
                <div className="text-[14px] font-semibold text-[#0F172A]">
                  {managerName}
                </div>
              ) : null}
              {!stampUrl && !managerName ? (
                <div className="text-[12px] italic text-[#94A3B8]">Signé</div>
              ) : null}
            </div>
          ) : (
            <div
              className="mx-auto mt-4 flex h-28 w-52 flex-col items-center justify-center rounded-lg border border-dashed text-[12px] italic text-[#94A3B8]"
              style={{ borderColor: `${accent}44` }}
            >
              En attente de signature
            </div>
          )}
        </div>
      </div>

      <LegalFooter {...company} niuLabel={niuLabel} />
    </PreviewShell>
  );
});
