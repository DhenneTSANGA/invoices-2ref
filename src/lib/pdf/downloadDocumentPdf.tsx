import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Document } from "@/store/types";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { exportDocumentPdf } from "@/lib/pdf/exportDocumentPdf";
import {
  getClient,
  getCompanyForCabinet,
  listClients,
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

async function waitForImages(root: ParentNode) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
    ),
  );
}

/**
 * Rend DocumentPreview hors champ (avec données cabinet/clients),
 * capture le PDF, puis démonte.
 */
export async function downloadDocumentPdf(doc: Document): Promise<void> {
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
  try {
    flushSync(() => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <DocumentPreview doc={doc} compact />
        </QueryClientProvider>,
      );
    });

    await waitFrames(2);
    await waitForImages(mount);
    await new Promise((r) => setTimeout(r, 80));

    const preview =
      (mount.querySelector("[data-document-preview]") as HTMLElement | null) ??
      (mount.firstElementChild as HTMLElement | null);

    if (!preview) {
      throw new Error("Aperçu introuvable pour l'export PDF.");
    }

    await exportDocumentPdf(preview, `${doc.number}.pdf`);
  } finally {
    root?.unmount();
    root = null;
    queryClient.clear();
    host.remove();
  }
}
