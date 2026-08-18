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
   * Capture PDF : jamais d’encadré « En attente de signature ».
   * Zone vide pour un paraphe manuscrit.
   */
  forPdf?: boolean;
  /** N’imprime pas l’image même si le document est signé. */
  omitStamp?: boolean;
  /** Cabinet : 2R Conseil utilise un cadre plus petit que 2REF. */
  cabinet?: Cabinet;
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
        "translate-x-3 text-center",
        compact ? "w-48" : conseil ? "w-96 max-w-full" : "w-[28rem] max-w-full",
        className,
      )}
    >
      {showStamp ? (
        <div
          className={cn(
            "ml-auto overflow-hidden bg-white",
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
            className="h-full w-full object-contain object-right [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
            style={{ color: "transparent", mixBlendMode: "normal", filter: "none" }}
          />
        </div>
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
