import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  listServices,
  listDocuments,
  getDocument,
  upsertDocument,
  setDocumentStatus,
  deleteDocument,
  getCompany,
  updateCompany,
} from "@/lib/data.functions";
import { getCurrentSession } from "@/lib/session.functions";
import type { DocumentStatus, DocumentType } from "@/store/types";
import type { z } from "zod";
import type { clientInputSchema, documentInputSchema, companyInputSchema } from "@/lib/auth-schemas";

export const sessionKey = ["session"] as const;
export const clientsKey = ["clients"] as const;
export const servicesKey = ["services"] as const;
export const documentsKey = (type?: DocumentType) =>
  type ? (["documents", type] as const) : (["documents"] as const);
export const companyKey = ["company"] as const;

export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: () => getCurrentSession(),
    staleTime: 5 * 60_000,
    refetchOnMount: false,
  });
}

export function useClients() {
  return useQuery({
    queryKey: clientsKey,
    queryFn: () => listClients(),
    staleTime: 60_000,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: [...clientsKey, id],
    queryFn: () => getClient({ data: { id } }),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof clientInputSchema>) =>
      createClient({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientsKey }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof clientInputSchema> & { id: string }) =>
      updateClient({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientsKey }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientsKey }),
  });
}

export function useServices() {
  return useQuery({
    queryKey: servicesKey,
    queryFn: () => listServices(),
    staleTime: 5 * 60_000,
  });
}

export function useDocuments(type?: DocumentType) {
  return useQuery({
    queryKey: documentsKey(type),
    queryFn: () => listDocuments({ data: { type } }),
    staleTime: 30_000,
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["document", id],
    queryFn: () => getDocument({ data: { id } }),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useUpsertDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof documentInputSchema>) =>
      upsertDocument({ data }),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: documentsKey() });
      qc.invalidateQueries({ queryKey: documentsKey(doc.type) });
      qc.invalidateQueries({ queryKey: ["document", doc.id] });
    },
  });
}

export function useSetDocumentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; status: DocumentStatus }) =>
      setDocumentStatus({ data: payload }),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: documentsKey() });
      qc.invalidateQueries({ queryKey: documentsKey(doc.type) });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDocument({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentsKey() }),
  });
}

export function useCompany() {
  return useQuery({
    queryKey: companyKey,
    queryFn: () => getCompany(),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof companyInputSchema>) =>
      updateCompany({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKey }),
  });
}
