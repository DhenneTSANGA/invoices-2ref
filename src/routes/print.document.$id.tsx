import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { buildPdfFromPreviewElement } from "@/lib/pdf/downloadDocumentPdf";
import type { PrintPayload } from "@/lib/pdf/print-types";
import { clientsKey, companyKey } from "@/hooks/use-data";

type PdfBridgeResult = {
  fileName: string;
  base64: string;
  previewBase64: string | null;
};

declare global {
  interface Window {
    __DOC_PDF_RESULT__?: PdfBridgeResult | null;
    __DOC_PDF_ERROR__?: string | null;
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Alimente React Query pour que l’aperçu se rende sans appel serveur authentifié. */
function seedPreviewCache(queryClient: ReturnType<typeof useQueryClient>, payload: PrintPayload) {
  const { doc, company, client } = payload;
  const options = { staleTime: Infinity, retry: false, refetchOnMount: false };
  queryClient.setQueryDefaults(companyKey, options);
  queryClient.setQueryDefaults(clientsKey, options);

  queryClient.setQueryData(companyKey, company);
  queryClient.setQueryData([...companyKey, doc.cabinet], company);

  const clients = client ? [client] : [];
  queryClient.setQueryData([...clientsKey, "active"], clients);
  queryClient.setQueryData([...clientsKey, doc.cabinet], clients);
  if (client) queryClient.setQueryData([...clientsKey, client.id], client);
}

function PrintDocumentPage() {
  const { id } = Route.useParams();
  const { token } = Route.useSearch();
  const queryClient = useQueryClient();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [payload, setPayload] = useState<PrintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Charge le document via un jeton signé (aucune session dans Chromium).
  useEffect(() => {
    let alive = true;
    window.__DOC_PDF_RESULT__ = null;
    window.__DOC_PDF_ERROR__ = null;

    const params = new URLSearchParams({ token });
    fetch(`/api/pdf/document/${encodeURIComponent(id)}?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        return (await res.json()) as PrintPayload;
      })
      .then((data) => {
        if (!alive) return;
        seedPreviewCache(queryClient, data);
        setPayload(data);
      })
      .catch((err) => {
        if (!alive) return;
        const message = errorMessage(err);
        setError(message);
        window.__DOC_PDF_ERROR__ = message;
      });

    return () => {
      alive = false;
    };
  }, [id, token, queryClient]);

  // Construit le PDF exactement comme le bouton « Envoyer » du navigateur.
  useEffect(() => {
    if (!payload || !mountRef.current) return;
    let alive = true;

    void (async () => {
      try {
        document.documentElement.classList.remove("dark");
        if (document.fonts?.ready) await document.fonts.ready;
        const built = await buildPdfFromPreviewElement(
          mountRef.current!,
          `${payload.doc.number}.pdf`,
        );
        if (!alive) return;
        window.__DOC_PDF_RESULT__ = {
          fileName: built.fileName,
          base64: built.base64,
          previewBase64: built.previewBase64 ?? null,
        };
      } catch (err) {
        if (!alive) return;
        const message = errorMessage(err);
        setError(message);
        window.__DOC_PDF_ERROR__ = message;
      }
    })();

    return () => {
      alive = false;
    };
  }, [payload]);

  return (
    <div
      style={{
        position: "fixed",
        left: "-10000px",
        top: 0,
        width: "820px",
        background: "#ffffff",
        zIndex: 0,
      }}
    >
      {error ? <p style={{ fontFamily: "sans-serif", padding: 16 }}>{error}</p> : null}
      <div ref={mountRef} style={{ width: "820px", background: "#ffffff" }}>
        {payload ? <DocumentPreview doc={payload.doc} compact omitSignature={false} /> : null}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/print/document/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
    links: [],
  }),
  component: PrintDocumentPage,
});
