import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

/** Même ratio que PreviewShell (820px × A4). */
const PREVIEW_WIDTH = 820;
const A4_MIN_HEIGHT = Math.round(PREVIEW_WIDTH * (297 / 210));

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export type BuiltPdf = {
  fileName: string;
  /** PDF raw bytes */
  bytes: Uint8Array;
  /** Base64 without data-URL prefix */
  base64: string;
};

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Capture un nœud DOM → PDF A4 **toujours sur 1 page**.
 * Les marges blanches viennent du padding du document (comme l’imprimé),
 * pas d’une bande ajoutée autour de l’image.
 */
export async function buildDocumentPdf(
  element: HTMLElement,
  filename: string,
): Promise<BuiltPdf> {
  await waitForPaint();

  const width = PREVIEW_WIDTH;
  const prevWidth = element.style.width;
  const prevMaxWidth = element.style.maxWidth;
  const prevMinHeight = element.style.minHeight;
  const prevHeight = element.style.height;

  element.style.width = `${width}px`;
  element.style.maxWidth = `${width}px`;
  element.style.minHeight = `${A4_MIN_HEIGHT}px`;
  element.style.height = `${A4_MIN_HEIGHT}px`;

  await waitForPaint();

  const height = Math.max(
    A4_MIN_HEIGHT,
    element.scrollHeight,
    element.offsetHeight,
    1,
  );
  if (height > A4_MIN_HEIGHT) {
    element.style.height = `${height}px`;
    element.style.minHeight = `${height}px`;
  }

  const inner = element.firstElementChild as HTMLElement | null;
  const prevInnerMin = inner?.style.minHeight;
  const prevInnerH = inner?.style.height;
  if (inner) {
    inner.style.minHeight = `${height}px`;
    inner.style.height = `${height}px`;
  }

  let dataUrl: string;
  try {
    try {
      dataUrl = await toJpeg(element, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        width,
        height,
        canvasWidth: width * 2,
        canvasHeight: height * 2,
        skipFonts: true,
        filter: (node) => {
          if (!(node instanceof HTMLElement)) return true;
          const tag = node.tagName.toLowerCase();
          return tag !== "script" && tag !== "noscript";
        },
        style: {
          transform: "none",
          margin: "0",
          width: `${width}px`,
          maxWidth: `${width}px`,
          minHeight: `${height}px`,
          height: `${height}px`,
        },
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll("img").forEach((node) => {
            const el = node as HTMLImageElement;
            el.style.color = "transparent";
            el.style.backgroundColor = "#ffffff";
            el.style.filter = "none";
            el.style.mixBlendMode = "normal";
            el.style.setProperty("-webkit-print-color-adjust", "exact");
            el.style.setProperty("print-color-adjust", "exact");
          });
        },
      });
    } catch {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        onclone: (_doc, cloned) => {
          cloned.style.width = `${width}px`;
          cloned.style.maxWidth = `${width}px`;
          cloned.style.minHeight = `${height}px`;
          cloned.style.height = `${height}px`;
          cloned.querySelectorAll("*").forEach((node) => {
            const el = node as HTMLElement;
            if (!el.style) return;
            if (el.tagName === "IMG") {
              el.style.color = "transparent";
              el.style.backgroundColor = "#ffffff";
              el.style.filter = "none";
              el.style.mixBlendMode = "normal";
              el.style.boxShadow = "none";
              return;
            }
            const cs = window.getComputedStyle(el);
            el.style.color = cs.color;
            el.style.backgroundColor = cs.backgroundColor;
            el.style.borderColor = cs.borderColor;
            el.style.boxShadow = "none";
          });
        },
      });
      dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    }
  } finally {
    element.style.width = prevWidth;
    element.style.maxWidth = prevMaxWidth;
    element.style.minHeight = prevMinHeight;
    element.style.height = prevHeight;
    if (inner) {
      inner.style.minHeight = prevInnerMin ?? "";
      inner.style.height = prevInnerH ?? "";
    }
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Plein cadre A4 : pas de marge PDF ni de réduction centrée (bandes blanches).
  pdf.addImage(dataUrl, "JPEG", 0, 0, pageWidth, pageHeight);

  const safeName = filename.replace(/[^\w.\-]+/g, "_");
  const fileName = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;
  const bytes = pdf.output("arraybuffer");
  const uint8 = new Uint8Array(bytes);

  return {
    fileName,
    bytes: uint8,
    base64: uint8ToBase64(uint8),
  };
}

/** Télécharge un fichier PDF côté navigateur. */
export function triggerPdfDownload(fileName: string, bytes: Uint8Array) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Capture + téléchargement local (compat ancienne API).
 */
export async function exportDocumentPdf(
  element: HTMLElement,
  filename: string,
): Promise<BuiltPdf> {
  const built = await buildDocumentPdf(element, filename);
  triggerPdfDownload(built.fileName, built.bytes);
  return built;
}
