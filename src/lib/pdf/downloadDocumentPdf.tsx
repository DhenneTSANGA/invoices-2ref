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

/** Convertit les images distantes en data-URL pour une capture PDF fiable (CORS). */
async function inlineImagesForPdf(root: ParentNode) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      const src = (img.currentSrc || img.src || "").trim();
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) {
        if (img.decode) {
          try {
            await img.decode();
          } catch {
            /* ignore */
          }
        }
        return;
      }
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const probe = new Image();
          probe.crossOrigin = "anonymous";
          probe.referrerPolicy = "no-referrer";
          probe.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = Math.max(1, probe.naturalWidth);
              canvas.height = Math.max(1, probe.naturalHeight);
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                reject(new Error("canvas"));
                return;
              }
              ctx.drawImage(probe, 0, 0);
              resolve(canvas.toDataURL("image/png"));
            } catch (e) {
              reject(e);
            }
          };
          probe.onerror = () => reject(new Error("load"));
          // Cache-bust pour forcer un chargement CORS propre
          const sep = src.includes("?") ? "&" : "?";
          probe.src = `${src}${sep}pdf=1`;
        });
        img.removeAttribute("crossorigin");
        img.src = dataUrl;
        if (img.decode) {
          try {
            await img.decode();
          } catch {
            /* ignore */
          }
        }
      } catch {
        // Garde l’URL d’origine ; la capture pourra échouer sur cette image seule
        img.crossOrigin = "anonymous";
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
export async function buildDocumentPdfFromDoc(doc: Document): Promise<BuiltPdf> {
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
          {/* Même rendu que l’aperçu écran (pas de densification) */}
          <DocumentPreview doc={doc} compact />
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
 */
export async function downloadDocumentPdf(doc: Document): Promise<void> {
  const built = await buildDocumentPdfFromDoc(doc);
  const persisted =
    Boolean(doc.id) &&
    !doc.id.startsWith("d-") &&
    !doc.id.startsWith("tmp-") &&
    !doc.id.startsWith("tpl-");

  if (persisted) {
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

  triggerPdfDownload(built.fileName, built.bytes);
}
