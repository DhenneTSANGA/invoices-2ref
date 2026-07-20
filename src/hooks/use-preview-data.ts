import type { Document } from "@/store/types";
import { REAL_2REF_COMPANY } from "@/lib/company-defaults";
import { useCompany, useClients } from "./use-data";

export function usePreviewData(doc: Document) {
  const { data: company } = useCompany();
  const { data: clients = [] } = useClients();
  const client = clients.find((c) => c.id === doc.clientId);
  return { company: company ?? REAL_2REF_COMPANY, client };
}
