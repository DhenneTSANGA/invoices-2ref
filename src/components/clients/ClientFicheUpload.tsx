import { FileUp, FileText, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  hint?: string;
  file: File | null;
  existingUrl?: string | null;
  existingName?: string | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
};

const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function ClientFicheUpload({
  label,
  hint = "PDF, Word ou image — 8 Mo max",
  file,
  existingUrl,
  existingName,
  onFileChange,
  disabled,
}: Props) {
  const displayName = file?.name ?? existingName ?? null;

  return (
    <div className="block sm:col-span-1">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div
        className={cn(
          "mt-1 rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4 transition",
          !disabled && "hover:border-primary/40 hover:bg-primary/5",
        )}
      >
        {displayName ? (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {file ? "Prêt à téléverser à l’enregistrement" : "Fichier enregistré"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {existingUrl && !file && (
                  <a
                    href={existingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ouvrir
                  </a>
                )}
                {!disabled && (
                  <>
                    <label className="cursor-pointer text-xs font-medium text-primary hover:underline">
                      {file ? "Changer" : "Remplacer"}
                      <input
                        type="file"
                        accept={ACCEPT}
                        className="sr-only"
                        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {file && (
                      <button
                        type="button"
                        onClick={() => onFileChange(null)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-danger"
                      >
                        <X className="h-3 w-3" />
                        Retirer
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 py-3 text-center",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
              <FileUp className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">Choisir un fichier</span>
            <span className="text-[11px] text-muted-foreground">{hint}</span>
            <input
              type="file"
              accept={ACCEPT}
              className="sr-only"
              disabled={disabled}
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function inferContentType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

export async function fileToBase64Payload(file: File): Promise<{
  fileName: string;
  contentType: string;
  base64: string;
}> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return {
    fileName: file.name,
    contentType: inferContentType(file),
    base64: btoa(binary),
  };
}
