import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  listServices,
  listDocuments,
  listAllDocuments,
  getDocument,
  upsertDocument,
  setDocumentStatus,
  deleteDocument,
  getCompany,
  getCompanyForCabinet,
  updateCompany,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  uploadClientFiche,
  setInvoiceSubscription,
  processDueSubscriptions,
} from "@/lib/data.functions";
import { sendDocumentEmail } from "@/lib/send-document-email";
import { getCurrentSession, type AppSession } from "@/lib/session.functions";
import type { DocumentStatus, DocumentType, NotificationItem, PaymentMethod } from "@/store/types";
import type { Cabinet } from "@/lib/cabinets";
import type { z } from "zod";
import type { clientInputSchema, documentInputSchema, companyInputSchema } from "@/lib/auth-schemas";

export const sessionKey = ["session"] as const;
export const clientsKey = ["clients"] as const;
export const servicesKey = ["services"] as const;
export const documentsKey = (type?: DocumentType, cabinetScope?: string) =>
  type
    ? (["documents", type, cabinetScope ?? "active"] as const)
    : (["documents", cabinetScope ?? "active"] as const);
export const allDocumentsKey = ["documents", "all"] as const;
export const companyKey = ["company"] as const;
export const notificationsKey = ["notifications"] as const;

const POLL_MS = 30_000;

function selectRouteSession(s: {
  matches: ReadonlyArray<{ context: unknown }>;
}): AppSession | undefined {
  for (let i = s.matches.length - 1; i >= 0; i--) {
    const ctx = s.matches[i]?.context as { session?: AppSession | null } | undefined;
    if (ctx?.session) return ctx.session;
  }
  return undefined;
}

/**
 * Session app. Seedée depuis le contexte route `/_app` (SSR + hydratation)
 * pour éviter un mismatch React Query vide côté client.
 */
export function useSession() {
  const fromRoute = useRouterState({ select: selectRouteSession });
  const qc = useQueryClient();
  const cached = qc.getQueryData<AppSession>(sessionKey);
  const initial = fromRoute ?? cached;

  return useQuery({
    queryKey: sessionKey,
    queryFn: () => getCurrentSession(),
    initialData: initial,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
  });
}

export function useClients(cabinetScope?: "all" | "conseil" | "expertise_fiscale") {
  return useQuery({
    queryKey: [...clientsKey, cabinetScope ?? "active"] as const,
    queryFn: () =>
      listClients({
        data: cabinetScope ? { cabinetScope } : {},
      }),
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

export function useUploadClientFiche() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      clientId: string;
      kind: "circuit" | "status";
      fileName: string;
      contentType: string;
      base64: string;
    }) => uploadClientFiche({ data }),
    onSuccess: (_row, vars) => {
      void qc.invalidateQueries({ queryKey: clientsKey });
      void qc.invalidateQueries({ queryKey: [...clientsKey, vars.clientId] });
    },
  });
}

export function useServices() {
  return useQuery({
    queryKey: servicesKey,
    queryFn: () => listServices(),
    staleTime: 5 * 60_000,
  });
}

export function useDocuments(
  type?: DocumentType,
  cabinetScope?: "all" | "conseil" | "expertise_fiscale",
) {
  return useQuery({
    queryKey: documentsKey(type, cabinetScope),
    queryFn: () =>
      listDocuments({
        data: { type, ...(cabinetScope ? { cabinetScope } : {}) },
      }),
    staleTime: 30_000,
  });
}

export function useAllDocuments(
  type?: DocumentType,
  cabinetScope?: "all" | "conseil" | "expertise_fiscale",
) {
  return useQuery({
    queryKey: type
      ? ([...allDocumentsKey, type, cabinetScope ?? "active"] as const)
      : ([...allDocumentsKey, cabinetScope ?? "active"] as const),
    queryFn: () =>
      listAllDocuments({
        data: { type, ...(cabinetScope ? { cabinetScope } : {}) },
      }),
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
      qc.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}

export function useSetDocumentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      id: string;
      status: DocumentStatus;
      paymentMethod?: PaymentMethod;
    }) => setDocumentStatus({ data: payload }),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: documentsKey() });
      qc.invalidateQueries({ queryKey: documentsKey(doc.type) });
      qc.invalidateQueries({ queryKey: ["document", doc.id] });
      qc.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}

export function useSetInvoiceSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      enabled: boolean;
      dayOfMonth?: number;
    }) => setInvoiceSubscription({ data }),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: documentsKey() });
      qc.invalidateQueries({ queryKey: documentsKey("invoice") });
      qc.invalidateQueries({ queryKey: ["document", doc.id] });
    },
  });
}

export function useProcessDueSubscriptions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => processDueSubscriptions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentsKey() });
      qc.invalidateQueries({ queryKey: documentsKey("invoice") });
      qc.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}

export function useSendDocumentEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendDocumentEmail({ data: { id } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: documentsKey() });
      qc.invalidateQueries({ queryKey: documentsKey(res.type) });
      qc.invalidateQueries({ queryKey: ["document", res.documentId] });
      qc.invalidateQueries({ queryKey: notificationsKey });
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

export function useCompanyForCabinet(cabinet: Cabinet) {
  return useQuery({
    queryKey: [...companyKey, cabinet] as const,
    queryFn: () => getCompanyForCabinet({ data: { cabinet } }),
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

export function useNotifications() {
  return useQuery({
    queryKey: notificationsKey,
    queryFn: () => listNotifications(),
    staleTime: 2_000,
    refetchInterval: POLL_MS,
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notificationsKey });
      const previous = qc.getQueryData<NotificationItem[]>(notificationsKey);
      qc.setQueryData<NotificationItem[]>(notificationsKey, (old = []) =>
        old.map((n) => ({ ...n, read: true })),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(notificationsKey, ctx.previous);
    },
    onSuccess: () => {
      qc.setQueryData<NotificationItem[]>(notificationsKey, (old = []) =>
        old.map((n) => ({ ...n, read: true })),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notificationsKey }),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notificationsKey });
      const previous = qc.getQueryData<NotificationItem[]>(notificationsKey);
      qc.setQueryData<NotificationItem[]>(notificationsKey, (old = []) =>
        old.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(notificationsKey, ctx.previous);
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<NotificationItem[]>(notificationsKey, (old = []) =>
        old.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notificationsKey }),
  });
}
