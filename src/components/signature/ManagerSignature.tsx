import { cn } from "@/lib/utils";

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
   * Capture PDF : jamais d’encadré « En attente de signature ».
   * Zone vide pour un paraphe manuscrit.
   */
  forPdf?: boolean;
  /** N’imprime pas l’image même si le document est signé. */
  omitStamp?: boolean;
};

/**
 * Signature électronique du gérant : image grande, nom collé juste en dessous.
 * L’encadré « en attente » n’apparaît que dans l’aperçu écran.
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
}: ManagerSignatureProps) {
  const url = signatureUrl?.trim() || "";
  const name = managerName?.trim() || "";
  const showStamp = Boolean(applied && url && !omitStamp);
  const hidePendingFrame = forPdf || omitStamp;

  return (
    <div
      className={cn(
        "translate-x-3 text-center",
        compact ? "w-48" : "w-[30rem] max-w-full",
        className,
      )}
    >
      {showStamp ? (
        <img
          src={url}
          alt={name ? `Signature de ${name}` : "Signature électronique"}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          decoding="sync"
          className={cn(
            "mx-auto bg-white object-contain object-right [print-color-adjust:exact] [-webkit-print-color-adjust:exact]",
            compact ? "max-h-20 max-w-[11rem]" : "h-auto max-h-64 w-full",
          )}
          style={{ color: "transparent", mixBlendMode: "normal", filter: "none" }}
        />
      ) : hidePendingFrame ? (
        <div
          className={cn("mx-auto w-full", compact ? "h-16" : "h-28")}
          aria-hidden="true"
        />
      ) : (
        <div
          className={cn(
            "mx-auto flex items-center justify-center rounded-lg border border-dashed text-[12px] italic text-[#94A3B8]",
            compact ? "h-20 w-40" : "h-36 w-full",
          )}
          style={{ borderColor: `${accent}44` }}
        >
          {pendingLabel}
        </div>
      )}

      {name ? (
        <div
          className={cn(
            "text-right font-semibold leading-tight text-[#0F172A]",
            compact ? "mt-0.5 pr-1 text-[12px]" : "mt-0.5 pr-2 text-[14px]",
          )}
        >
          {name}
        </div>
      ) : null}
    </div>
  );
}
