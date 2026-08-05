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
 * Capture un nœud DOM déjà monté et layouté → bytes PDF A4 (toujours 1 page).
 * Si le contenu dépasse, il est réduit proportionnellement pour tenir dans la page.
 */
export async function buildDocumentPdf(
  element: HTMLElement,
  filename: string,
): Promise<BuiltPdf> {
  await waitForPaint();

  const width = Math.max(element.scrollWidth, element.offsetWidth, 820);
  const height = Math.max(element.scrollHeight, element.offsetHeight, 1);
  if (!width || !height) {
    throw new Error("Le document n'a pas de dimensions capturables.");
  }

  let dataUrl: string;
  try {
    dataUrl = await toJpeg(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      width,
      height,
      skipFonts: true,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        const tag = node.tagName.toLowerCase();
        return tag !== "script" && tag !== "noscript";
      },
      style: {
        transform: "none",
        margin: "0",
      },
    });
  } catch (err) {
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

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 5;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  // Dimensions naturelles (largeur = zone utile)
  const naturalW = usableWidth;
  const naturalH = (height * naturalW) / width;

  // Toujours une seule page : réduire si besoin, ne jamais agrandir
  const fit = Math.min(1, usableWidth / naturalW, usableHeight / naturalH);
  const finalW = naturalW * fit;
  const finalH = naturalH * fit;
  const x = margin + (usableWidth - finalW) / 2;
  const y = margin + (usableHeight - finalH) / 2;

  pdf.addImage(dataUrl, "JPEG", x, y, finalW, finalH);

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
