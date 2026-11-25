import { createFileRoute } from "@tanstack/react-router";
import { verifyPdfRenderToken } from "@/lib/pdf/print-token";

/** `/api/pdf/document/<id>` → id (dernier segment). */
function documentIdFromUrl(url: string): string {
  const pathname = new URL(url).pathname.replace(/\/+$/, "");
  return decodeURIComponent(pathname.slice(pathname.lastIndexOf("/") + 1));
}

export const Route = createFileRoute("/api/pdf/document/$id")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const documentId = documentIdFromUrl(request.url);
        if (!verifyPdfRenderToken(documentId, url.searchParams.get("token"))) {
          return Response.json({ error: "Non autorisé" }, { status: 401 });
        }

        try {
          const { loadPrintPayload } = await import("@/lib/pdf/print-payload.server");
          const payload = await loadPrintPayload(documentId);
          return Response.json(payload, {
            headers: { "cache-control": "no-store" },
          });
        } catch (err) {
          console.error("[api/pdf/document]", documentId, err);
          return Response.json(
            { error: err instanceof Error ? err.message : "Erreur serveur" },
            { status: 404 },
          );
        }
      },
    },
  },
});
