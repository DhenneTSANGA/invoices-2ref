import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import type { Document } from "@/store/types";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { exportDocumentPdf } from "@/lib/pdf/exportDocumentPdf";

/**
 * Rend DocumentPreview hors champ, capture le PDF, puis démonte.
 */
export async function downloadDocumentPdf(doc: Document): Promise<void> {
  const host = document.createElement("div");
  host.setAttribute("data-pdf-capture", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "820px",
    zIndex: "-1",
    opacity: "0.01",
    pointerEvents: "none",
    background: "#ffffff",
  });
  document.body.appendChild(host);

  const mount = document.createElement("div");
  mount.style.width = "820px";
  mount.style.background = "#ffffff";
  host.appendChild(mount);

  let root: Root | null = createRoot(mount);
  flushSync(() => {
    root!.render(<DocumentPreview doc={doc} />);
  });

  // Laisser le navigateur peindre les styles Tailwind
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  await new Promise((r) => setTimeout(r, 120));

  try {
    const el = mount.firstElementChild as HTMLElement | null;
    if (!el) throw new Error("Aperçu introuvable pour l'export PDF.");
    await exportDocumentPdf(el, `${doc.number}.pdf`);
  } finally {
    root?.unmount();
    root = null;
    host.remove();
  }
}
