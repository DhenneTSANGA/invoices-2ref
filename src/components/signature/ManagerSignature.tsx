import { cn } from "@/lib/utils";

export type ManagerSignatureProps = {
  /** URL publique de la signature manuscrite (PNG). */
  signatureUrl?: string | null;
  managerName?: string | null;
  signatoryTitle?: string | null;
  /** Affiche la signature (document signé / envoyé). */
  applied?: boolean;
  accent?: string;
  className?: string;
  /** Mode compact (liste, miniatures). */
  compact?: boolean;
  pendingLabel?: string;
};

/**
 * Signature électronique réutilisable du gérant (image stockée + nom).
 * Utilisable dans les aperçus PDF, e-mails (via URL) et paramètres.
 */
export function ManagerSignature({
  signatureUrl,
  managerName,
  signatoryTitle = "Le Gérant",
  applied = false,
  accent = "#01004C",
  className,
  compact = false,
  pendingLabel = "En attente de signature",
}: ManagerSignatureProps) {
  const url = signatureUrl?.trim() || "";
  const name = managerName?.trim() || "";

  return (
    <div className={cn("text-center", compact ? "w-48" : "w-72", className)}>
      {signatoryTitle ? (
        <div
          className={cn(
            "font-semibold",
            compact ? "text-[12px]" : "text-[13px]",
          )}
          style={{ color: accent }}
        >
          {signatoryTitle}
        </div>
      ) : null}

      {applied ? (
        <div
          className={cn(
            "mt-3 flex flex-col items-center justify-center gap-2",
            compact ? "min-h-[5rem]" : "min-h-[10rem]",
          )}
        >
          {url ? (
            <img
              src={url}
              alt={name ? `Signature de ${name}` : "Signature électronique"}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              decoding="sync"
              className={cn(
                "object-contain object-center",
                compact ? "max-h-20 max-w-[11rem]" : "max-h-44 max-w-[17rem]",
              )}
            />
          ) : null}
          {name ? (
            <div
              className={cn(
                "font-semibold text-[#0F172A]",
                compact ? "text-[12px]" : "text-[14px]",
              )}
            >
              {name}
            </div>
          ) : !url ? (
            <div className="text-[12px] italic text-[#94A3B8]">Signé</div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-2">
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border border-dashed text-[12px] italic text-[#94A3B8]",
              compact ? "h-20 w-40" : "h-44 w-64",
            )}
            style={{ borderColor: `${accent}44` }}
          >
            {pendingLabel}
          </div>
          {name ? (
            <div
              className={cn(
                "font-semibold text-[#0F172A]",
                compact ? "text-[12px]" : "text-[14px]",
              )}
            >
              {name}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
