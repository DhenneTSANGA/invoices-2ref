import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { usePreviewData } from "@/hooks/use-preview-data";
import { longDate } from "@/lib/format";
import { LegalFooter, PreviewLogo, PreviewShell } from "./PreviewShell";

type Props = { doc: Document; compact?: boolean; variant?: "full" | "thumb"; className?: string };

const ACCENT = "#B45309";
const ACCENT_SOFT = "#FFF7ED";
const ACCENT_LINE = "#FDBA74";
const INK = "#0F172A";
const MUTED = "#64748B";
const BODY = "#334155";

export const LetterPreview = forwardRef<HTMLDivElement, Props>(function LetterPreview(
  { doc, compact, variant = "full", className },
  ref,
) {
  const { company, client } = usePreviewData(doc);
  const isThumb = variant === "thumb";
  const city = company.city.split(",")[0] || company.city;

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
      {/* Bandeau supérieur */}
      <div
        className="-mx-7 -mt-7 mb-6 flex items-stretch overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #D97706 100%)` }}
      >
        <div className="flex flex-1 items-center gap-3 px-7 py-4 text-white">
          <div className="rounded-xl bg-white p-1.5 shadow-sm">
            <PreviewLogo cabinet={doc.cabinet} className="h-12" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-[17px] font-bold tracking-tight">{company.name}</div>
            {company.tagline && (
              <div className="truncate text-[12px] text-white/80">{company.tagline}</div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end justify-center border-l border-white/20 px-7 py-4 text-right text-white">
          <div className="font-display text-[26px] font-bold uppercase tracking-[0.12em]">Lettre</div>
          <div className="mt-0.5 text-[13px] font-semibold text-white/95">N° {doc.number}</div>
          <div className="text-[12px] text-white/75">{longDate(doc.issueDate)}</div>
        </div>
      </div>

      {/* Coordonnées société + mentions légales */}
      <div className="flex items-start justify-between gap-6 border-b pb-4" style={{ borderColor: ACCENT_LINE }}>
        <div className="space-y-0.5 text-[12px] leading-relaxed" style={{ color: MUTED }}>
          <div>{company.address}</div>
          <div>{company.city}</div>
          <div>
            {company.phone}
            {company.email ? ` · ${company.email}` : ""}
          </div>
          {company.website && <div>{company.website}</div>}
        </div>
        <div className="shrink-0 rounded-lg px-3.5 py-2.5 text-right text-[11px] leading-relaxed" style={{ background: ACCENT_SOFT, color: MUTED }}>
          <div>
            NIF <b style={{ color: INK }}>{company.nif}</b>
          </div>
          {company.niu && company.niu !== "—" && (
            <div>
              NIU <b style={{ color: INK }}>{company.niu}</b>
            </div>
          )}
          <div>
            RCCM <b style={{ color: INK }}>{company.rccm}</b>
          </div>
        </div>
      </div>

      {/* Lieu-date + destinataire */}
      <div className="mt-6 grid grid-cols-2 gap-8">
        <div className="text-[13px]" style={{ color: BODY }}>
          <span className="font-medium" style={{ color: INK }}>
            {city}
          </span>
          , le {longDate(doc.issueDate)}
        </div>
        <div
          className="rounded-xl border-2 px-4 py-3.5 whitespace-pre-line text-[13px] leading-relaxed"
          style={{ borderColor: `${ACCENT}33`, background: ACCENT_SOFT, color: BODY }}
        >
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: ACCENT }}>
            Destinataire
          </div>
          <div className="font-medium" style={{ color: INK }}>
            {recipient}
          </div>
        </div>
      </div>

      {/* Objet */}
      <div
        className="mt-6 rounded-xl border-l-4 px-4 py-3.5"
        style={{ borderColor: ACCENT, background: ACCENT_SOFT }}
      >
        <div className="text-[13px] leading-snug">
          <span className="font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
            Objet
          </span>
          <span className="mx-2" style={{ color: ACCENT_LINE }}>
            —
          </span>
          <span className="font-semibold" style={{ color: INK }}>
            {doc.subject || "Courrier commercial"}
          </span>
        </div>
        {doc.number && (
          <div className="mt-1 text-[12px]" style={{ color: MUTED }}>
            Référence : <span className="font-mono font-medium" style={{ color: BODY }}>{doc.number}</span>
          </div>
        )}
      </div>

      {/* Corps */}
      <div className="mt-7 flex-1">
        <div className="text-[14px] font-medium" style={{ color: INK }}>
          {doc.salutation || "Madame, Monsieur,"}
        </div>

        <div className="mt-4 whitespace-pre-line text-[13.5px] leading-7" style={{ color: BODY }}>
          {body}
        </div>

        <div className="mt-7 text-[13.5px] leading-relaxed" style={{ color: BODY }}>
          {doc.closing ||
            "Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées."}
        </div>
      </div>

      {/* Signature */}
      <div className="mt-10 flex justify-end">
        <div className="w-56 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: MUTED }}>
            Pour {company.name}
          </div>
          <div className="mt-3 text-[14px] font-semibold" style={{ color: INK }}>
            Mireille Ndong
          </div>
          <div className="mt-0.5 text-[12px] font-medium" style={{ color: ACCENT }}>
            {doc.signatoryTitle || "Expert-comptable"}
          </div>
          <div
            className="mx-auto mt-5 flex h-16 w-36 flex-col items-center justify-center rounded-xl border-2 border-dashed text-[11px] italic"
            style={{ borderColor: `${ACCENT}55`, background: ACCENT_SOFT, color: `${ACCENT}aa` }}
          >
            <span>Signature / Cachet</span>
          </div>
        </div>
      </div>

      <LegalFooter {...company} />
    </PreviewShell>
  );
});
