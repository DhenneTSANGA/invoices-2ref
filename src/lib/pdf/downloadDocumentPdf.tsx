import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Document } from "@/store/types";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import {
  buildDocumentPdf,
  triggerPdfDownload,
  type BuiltPdf,
} from "@/lib/pdf/exportDocumentPdf";
import {
  getClient,
  getCompanyForCabinet,
  listClients,
  recordDocumentPdf,
} from "@/lib/data.functions";
import { COMPANY_DEFAULTS } from "@/lib/company-defaults";
import { clientsKey, companyKey } from "@/hooks/use-data";

function waitFrames(n = 2) {
  return new Promise<void>((resolve) => {
    const step = (left: number) => {
      if (left <= 0) resolve();
      else requestAnimationFrame(() => step(left - 1));
    };
    step(n);
  });
}

/** Dessine l’image sur fond blanc : fige les couleurs (pas de teinte CSS / currentColor). */
function rasterizeImageOnWhite(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

function isolateImgColors(img: HTMLImageElement) {
  img.style.color = "transparent";
  img.style.backgroundColor = "#ffffff";
  img.style.filter = "none";
  img.style.mixBlendMode = "normal";
  img.style.setProperty("-webkit-print-color-adjust", "exact");
  img.style.setProperty("print-color-adjust", "exact");
}

/** Convertit les images en PNG opaque pour une capture PDF aux couleurs d’origine. */
async function inlineImagesForPdf(root: ParentNode) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      const src = (img.currentSrc || img.src || "").trim();
      if (!src) return;

      const applyRaster = (source: HTMLImageElement) => {
        const w = Math.max(1, source.naturalWidth || img.naturalWidth || img.width);
        const h = Math.max(1, source.naturalHeight || img.naturalHeight || img.height);
        img.removeAttribute("crossorigin");
        img.src = rasterizeImageOnWhite(source, w, h);
        isolateImgColors(img);
      };

      try {
        if (src.startsWith("data:") || src.startsWith("blob:")) {
          if (img.decode) {
            try {
              await img.decode();
            } catch {
              /* ignore */
            }
          }
          applyRaster(img);
          return;
        }

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const probe = new Image();
          probe.crossOrigin = "anonymous";
          probe.referrerPolicy = "no-referrer";
          probe.onload = () => {
            try {
              const w = Math.max(1, probe.naturalWidth);
              const h = Math.max(1, probe.naturalHeight);
              resolve(rasterizeImageOnWhite(probe, w, h));
            } catch (e) {
              reject(e);
            }
          };
          probe.onerror = () => reject(new Error("load"));
          const sep = src.includes("?") ? "&" : "?";
          probe.src = `${src}${sep}pdf=1`;
        });
        img.removeAttribute("crossorigin");
        img.src = dataUrl;
        isolateImgColors(img);
        if (img.decode) {
          try {
            await img.decode();
          } catch {
            /* ignore */
          }
        }
      } catch {
        img.crossOrigin = "anonymous";
        isolateImgColors(img);
        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        }
      }
    }),
  );
}

/**
 * Rend DocumentPreview hors champ et construit le PDF (bytes + base64).
 */
export async function buildDocumentPdfFromDoc(
  doc: Document,
  options?: { omitSignature?: boolean },
): Promise<BuiltPdf> {
  const omitSignature = options?.omitSignature ?? true;
  const [company, clients, singleClient] = await Promise.all([
    getCompanyForCabinet({ data: { cabinet: doc.cabinet } }).catch(
      () => COMPANY_DEFAULTS[doc.cabinet],
    ),
    listClients({ data: { cabinetScope: doc.cabinet } }).catch(() => []),
    doc.clientId
      ? getClient({ data: { id: doc.clientId } }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const clientList = Array.isArray(clients) ? [...clients] : [];
  if (singleClient && !clientList.some((c) => c.id === singleClient.id)) {
    clientList.push(singleClient);
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: Infinity, retry: false },
    },
  });
  queryClient.setQueryData([...companyKey, doc.cabinet] as const, company);
  queryClient.setQueryData(companyKey, company);
  queryClient.setQueryData([...clientsKey, "active"] as const, clientList);
  queryClient.setQueryData([...clientsKey, doc.cabinet] as const, clientList);
  if (singleClient) {
    queryClient.setQueryData([...clientsKey, singleClient.id] as const, singleClient);
  }

  const host = document.createElement("div");
  host.setAttribute("data-pdf-capture", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "820px",
    zIndex: "0",
    opacity: "1",
    pointerEvents: "none",
    background: "#ffffff",
    overflow: "visible",
  });
  document.body.appendChild(host);

  const mount = document.createElement("div");
  mount.style.width = "820px";
  mount.style.maxWidth = "820px";
  mount.style.background = "#ffffff";
  host.appendChild(mount);

  let root: Root | null = createRoot(mount);
  try {
    flushSync(() => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          {/* Impression : pas de tampon. E-mail : omitSignature false. */}
          <DocumentPreview doc={doc} compact omitSignature={omitSignature} />
        </QueryClientProvider>,
      );
    });

    await waitFrames(3);
    await inlineImagesForPdf(mount);
    await new Promise((r) => setTimeout(r, 80));

    const preview =
      (mount.querySelector("[data-document-preview]") as HTMLElement | null) ??
      (mount.firstElementChild as HTMLElement | null);

    if (!preview) {
      throw new Error("Aperçu introuvable pour l'export PDF.");
    }

    preview.style.width = "820px";
    preview.style.maxWidth = "820px";

    return await buildDocumentPdf(preview, `${doc.number}.pdf`);
  } finally {
    root?.unmount();
    root = null;
    queryClient.clear();
    host.remove();
  }
}

/**
 * Génère le PDF, l'enregistre comme trace (Storage + DB), puis télécharge localement.
 * Les documents non persistés (brouillon tmp) sont seulement téléchargés.
 * `includeSignature` : aperçu admin du tampon électronique (pas d’enregistrement de trace).
 */
export async function downloadDocumentPdf(
  doc: Document,
  options?: { includeSignature?: boolean },
): Promise<void> {
  const includeSignature = Boolean(options?.includeSignature);
  const previewDoc: Document = includeSignature
    ? { ...doc, status: "signed" }
    : doc;
  const built = await buildDocumentPdfFromDoc(previewDoc, {
    omitSignature: !includeSignature,
  });
  const persisted =
    Boolean(doc.id) &&
    !doc.id.startsWith("d-") &&
    !doc.id.startsWith("tmp-") &&
    !doc.id.startsWith("tpl-");

  if (persisted && !includeSignature) {
    try {
      await recordDocumentPdf({
        data: {
          documentId: doc.id,
          action: "download",
          fileName: built.fileName,
          base64: built.base64,
        },
      });
    } catch (err) {
      console.warn("[downloadDocumentPdf] trace non enregistrée", err);
    }
  }

  const fileName = includeSignature
    ? built.fileName.replace(/\.pdf$/i, "-signe.pdf")
    : built.fileName;
  triggerPdfDownload(fileName, built.bytes);
}
