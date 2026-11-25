import type { Client, CompanyInfo, Document } from "@/store/types";

/** Charge utile de la page d’impression PDF (client + société + document). */
export type PrintPayload = {
  doc: Document;
  company: CompanyInfo;
  client: Client | null;
};
