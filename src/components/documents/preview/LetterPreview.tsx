import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { longDate } from "@/lib/format";
import { PreviewLogo, PreviewShell } from "./PreviewShell";

type Props = { doc: Document; compact?: boolean; variant?: "full" | "thumb"; className?: string };

const INK = "#1a1a1a";
const BODY = "#222222";
const MUTED = "#555555";

export const LetterPreview = forwardRef<HTMLDivElement, Props>(function LetterPreview(
  { doc, compact, variant = "full", className },
  ref,
) {
  const { company, client } = usePreviewData(doc);
  const isThumb = variant === "thumb";
  const city = (company.city.split(",")[0] || company.city).trim();
  const showStamp = doc.status === "signed" || doc.status === "sent";
  const managerName = company.managerName?.trim() || "";
  const stampUrl = company.stampUrl?.trim() || "";
  const signatoryTitle = doc.signatoryTitle?.trim() || "Le Gérant";

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
      accent="#1a1a1a"
      compact={compact}
      isThumb={isThumb}
      className={className}
    >
      {/* En-tête : logo + lieu/date */}
      <div className="flex items-start justify-between gap-6">
        <PreviewLogo cabinet={doc.cabinet} className="h-20" />
        <div
          className="pt-2 text-right text-[13.5px] leading-relaxed"
          style={{ color: BODY, fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {city}, le {longDate(doc.issueDate)}.
        </div>
      </div>

      {/* Destinataire */}
      <div
        className="mt-10 ml-auto w-[48%] whitespace-pre-line text-[13.5px] leading-[1.55]"
        style={{ color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {recipientLines || (
          <span style={{ color: MUTED }}>Destinataire à renseigner</span>
        )}
      </div>

      {/* REF + Objet */}
      <div
        className="mt-10 space-y-2 text-[13.5px] leading-[1.55]"
        style={{ color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        <div>
          <span className="font-bold">REF :</span>{" "}
          <span>{doc.number}</span>
        </div>
        <div>
          <span className="font-bold">Objet :</span>{" "}
          <span>{doc.subject?.trim() || ""}</span>
        </div>
      </div>

      {/* Formule d'appel */}
      <div
        className="mt-8 text-[13.5px] leading-[1.7]"
        style={{ color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {doc.salutation?.trim() || ""}
      </div>

      {/* Corps */}
      <div
        className="mt-5 flex-1 whitespace-pre-line text-[13.5px] leading-[1.75] text-justify"
        style={{ color: BODY, fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {doc.body?.trim() || ""}
      </div>

      {/* Formule de politesse */}
      {doc.closing?.trim() ? (
        <div
          className="mt-8 whitespace-pre-line text-[13.5px] leading-[1.7] text-justify"
          style={{ color: BODY, fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {doc.closing.trim()}
        </div>
      ) : null}

      {/* Signature / cachet */}
      <div className="mt-10 flex justify-end">
        <div
          className="w-64 text-center"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          <div className="text-[13.5px] font-semibold" style={{ color: INK }}>
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
                <div className="text-[14px] font-semibold" style={{ color: INK }}>
                  {managerName}
                </div>
              ) : null}
              {!stampUrl && !managerName ? (
                <div className="text-[12px] italic" style={{ color: MUTED }}>
                  Signé
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className="mx-auto mt-4 flex h-28 w-52 flex-col items-center justify-center rounded border border-dashed text-[12px] italic"
              style={{ borderColor: "#cbd5e1", color: MUTED }}
            >
              En attente de signature
            </div>
          )}
        </div>
      </div>

      {/* Pied de page type courrier officiel */}
      <div className="relative mt-auto shrink-0 pt-6">
        <div
          className="border-t pt-3 text-center text-[10px] leading-snug"
          style={{ borderColor: "#cbd5e1", color: MUTED }}
        >
          {[
            company.tagline,
            [company.address, company.city].filter(Boolean).join(", "),
            company.rccm && `RCCM : ${company.rccm}`,
            company.nif && company.nif !== "—" && `NIF : ${company.nif}`,
            company.niu &&
              company.niu !== "—" &&
              `${doc.cabinet === "conseil" ? "STAT" : "NIU"} : ${company.niu}`,
          ]
            .filter(Boolean)
            .join(" · ")}
          <br />
          {[company.phone && `Tél. : ${company.phone}`, company.email]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {/* Coins décoratifs sobres (référence courrier) */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-0 w-0"
          style={{
            borderBottom: "18px solid #4b5563",
            borderRight: "18px solid transparent",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-0 w-0"
          style={{
            borderBottom: "18px solid #4b5563",
            borderLeft: "18px solid transparent",
          }}
        />
      </div>
    </PreviewShell>
  );
});
