import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

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
 * Remplit la largeur ; si le contenu dépasse en hauteur, réduction
 * proportionnelle légère (évite 2 pages avec seulement le pied / signature).
 */
export async function buildDocumentPdf(
  element: HTMLElement,
  filename: string,
): Promise<BuiltPdf> {
  await waitForPaint();

  const width = 820;
  const height = Math.max(element.scrollHeight, element.offsetHeight, 1);
  if (!height) {
    throw new Error("Le document n'a pas de dimensions capturables.");
  }

  const prevWidth = element.style.width;
  const prevMaxWidth = element.style.maxWidth;
  element.style.width = `${width}px`;
  element.style.maxWidth = `${width}px`;

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
          cloned.querySelectorAll("*").forEach((node) => {
            const el = node as HTMLElement;
            if (!el.style) return;
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
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 6;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  // Taille naturelle à largeur pleine page
  let imgWidth = usableWidth;
  let imgHeight = (height * imgWidth) / width;

  // Une seule page : réduire proportionnellement si besoin (jamais agrandir)
  if (imgHeight > usableHeight) {
    const scale = usableHeight / imgHeight;
    imgWidth *= scale;
    imgHeight = usableHeight;
  }

  const x = margin + (usableWidth - imgWidth) / 2;
  const y = margin; // aligné en haut (pas centré → évite l’effet « timbre »)

  pdf.addImage(dataUrl, "JPEG", x, y, imgWidth, imgHeight);

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
