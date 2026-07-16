import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Capture un nœud DOM déjà monté et layouté, puis télécharge un PDF A4.
 */
export async function exportDocumentPdf(element: HTMLElement, filename: string): Promise<void> {
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
    // Fallback si html-to-image échoue (ex. couleurs oklch)
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
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const imgWidth = usableWidth;
  const imgHeight = (height * imgWidth) / width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(dataUrl, "JPEG", margin, position, imgWidth, imgHeight);
  heightLeft -= usableHeight;

  while (heightLeft > 1) {
    position = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(dataUrl, "JPEG", margin, position, imgWidth, imgHeight);
    heightLeft -= usableHeight;
  }

  const safeName = filename.replace(/[^\w.\-]+/g, "_");
  pdf.save(safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`);
}
