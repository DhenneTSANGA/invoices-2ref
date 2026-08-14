import type { Document } from "@/store/types";
import { COMPANY_DEFAULTS } from "@/lib/company-defaults";
import { useCompanyForCabinet, useClients, useClient } from "./use-data";

/**
 * Données société + client pour l’aperçu / PDF d’un document.
 * Toujours scopées sur le cabinet **du document**, pas le cabinet actif de session.
 */
export function usePreviewData(doc: Document) {
  const { data: company } = useCompanyForCabinet(doc.cabinet);
  const { data: clients = [] } = useClients(doc.cabinet);
  const { data: fetchedClient } = useClient(doc.clientId);
  const client =
    clients.find((c) => c.id === doc.clientId) ?? fetchedClient ?? undefined;
  return {
    company: company ?? COMPANY_DEFAULTS[doc.cabinet],
    client,
  };
}
