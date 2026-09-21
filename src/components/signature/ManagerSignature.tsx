import { cn } from "@/lib/utils";
import type { Cabinet } from "@/lib/cabinets";

export type ManagerSignatureProps = {
  /** URL publique de la signature manuscrite (PNG). */
  signatureUrl?: string | null;
  managerName?: string | null;
  /** Conservé pour compatibilité — non affiché. */
  signatoryTitle?: string | null;
  /** Affiche la signature (document signé / envoyé). */
  applied?: boolean;
  accent?: string;
  className?: string;
  /** Mode compact (liste, miniatures). */
  compact?: boolean;
  pendingLabel?: string;
  /**
   * Capture PDF : pas de libellé « En attente de signature ».
   * Le cadre vide reste affiché comme zone de paraphe manuscrit.
   */
  forPdf?: boolean;
  /** N’imprime pas l’image même si le document est signé. */
  omitStamp?: boolean;
  /** Cabinet : 2R Conseil utilise un cadre plus petit que 2REF. */
  cabinet?: Cabinet;
};

/**
 * Signature électronique du gérant : image grande, nom collé juste en dessous.
 * Sans tampon : encadré pointillé (libellé « en attente » à l’écran seulement).
 */
export function ManagerSignature({
  signatureUrl,
  managerName,
  applied = false,
  accent = "#01004C",
  className,
  compact = false,
  pendingLabel = "En attente de signature",
  forPdf = false,
  omitStamp = false,
  cabinet,
}: ManagerSignatureProps) {
  const url = signatureUrl?.trim() || "";
  const name = managerName?.trim() || "";
  const showStamp = Boolean(applied && url && !omitStamp);
  const hidePendingFrame = forPdf || omitStamp;
  const conseil = cabinet === "conseil";

  return (
    <div
      className={cn(
        "text-center",
        compact ? "w-48" : conseil ? "w-96 max-w-full" : "w-[28rem] max-w-full",
        className,
      )}
    >
      {showStamp ? (
        <div
          className={cn(
            "mx-auto overflow-hidden bg-white",
            compact
              ? conseil
                ? "h-16 w-40"
                : "h-20 w-44"
              : conseil
                ? "h-48 w-full"
                : "h-60 w-full",
          )}
        >
          <img
            src={url}
            alt={name ? `Signature de ${name}` : "Signature électronique"}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            decoding="sync"
            className="h-full w-full object-contain object-center [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
            style={{ color: "transparent", mixBlendMode: "normal", filter: "none" }}
          />
        </div>
      ) : (
        <div
          className={cn(
            "mx-auto flex items-center justify-center rounded-lg border border-dashed",
            compact ? "h-20 w-40" : "h-36 w-full",
            hidePendingFrame ? "" : "text-[12px] italic text-[#94A3B8]",
          )}
          style={{ borderColor: `${accent}44` }}
          aria-hidden={hidePendingFrame || undefined}
        >
          {hidePendingFrame ? null : pendingLabel}
        </div>
      )}

      {name ? (
        <div
          className={cn(
            "text-center font-semibold leading-tight text-[#0F172A]",
            compact ? "mt-0.5 text-[12px]" : "mt-0.5 text-[13px]",
          )}
        >
          {name}
        </div>
      ) : null}
    </div>
  );
}
