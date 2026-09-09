import type { Document, DocumentType } from "@/store/types";

export type DocumentDetailRoute = {
  to: "/invoices/$id" | "/quotations/$id" | "/lettre/$id";
  params: { id: string };
};

/** Lien TanStack Router vers la page détail du document. */
export function documentDetailRoute(
  doc: Pick<Document, "id" | "type">,
): DocumentDetailRoute {
  switch (doc.type) {
    case "invoice":
      return { to: "/invoices/$id", params: { id: doc.id } };
    case "quotation":
      return { to: "/quotations/$id", params: { id: doc.id } };
    case "letter":
      return { to: "/lettre/$id", params: { id: doc.id } };
  }
}

/** Chemin URL (navigate, href externe). */
export function documentDetailPath(
  doc: Pick<Document, "id" | "type">,
): string {
  const { to, params } = documentDetailRoute(doc);
  return to.replace("$id", params.id);
}

export function documentDetailRouteForType(
  type: DocumentType,
  id: string,
): DocumentDetailRoute {
  return documentDetailRoute({ id, type });
}
