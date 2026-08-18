import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  listServices,
  upsertService,
  deleteService,
  listDocuments,
  listAllDocuments,
  getDocument,
  peekNextDocumentNumber,
  upsertDocument,
  setDocumentStatus,
  deleteDocument,
  getCompany,
  getCompanyForCabinet,
  updateCompany,
  uploadCompanySignature,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  uploadClientFiche,
  setInvoiceSubscription,
  processDueSubscriptions,
  listDocumentPdfTraces,
} from "@/lib/data.functions";
import {
  listMails,
  getMail,
  syncInboundMails,
  clearMailHistory,
} from "@/lib/mail.functions";
import { sendDocumentEmail } from "@/lib/send-document-email";
import {
  getLetterSignatureRequest,
  requestLetterSignature,
  signLetterDocument,
  rejectLetterSignature,
} from "@/lib/letter-signature.functions";
import {
  buildDocumentPdfFromDoc,
  downloadDocumentPdf,
} from "@/lib/pdf/downloadDocumentPdf";
import { getCurrentSession, type AppSession } from "@/lib/session.functions";
import type {
  Document,
  DocumentStatus,
  DocumentType,
  NotificationItem,
  PaymentMethod,
} from "@/store/types";
import type { Cabinet } from "@/lib/cabinets";
import type { z } from "zod";
import type { clientInputSchema, documentInputSchema, companyInputSchema, serviceInputSchema } from "@/lib/auth-schemas";

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
export const documentPdfTracesKey = (documentId: string) =>
  ["document-pdf-traces", documentId] as const;

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

export function useClients(cabinetScope?: "conseil" | "expertise_fiscale") {
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

export function useUpsertService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof serviceInputSchema>) =>
      upsertService({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: servicesKey }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteService({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: servicesKey }),
  });
}

export function useDocuments(
  type?: DocumentType,
  cabinetScope?: "conseil" | "expertise_fiscale",
) {
  return useQuery({
    queryKey: documentsKey(type, cabinetScope),
    queryFn: () =>
      listDocuments({
        data: { type, ...(cabinetScope ? { cabinetScope } : {}) },
      }),
    staleTime: 60_000,
  });
}

function mergeDocumentsById(docs: Document[]): Document[] {
  const map = new Map<string, Document>();
  for (const d of docs) map.set(d.id, d);
  return Array.from(map.values());
}

/**
 * Liste « tous documents » : affiche d’abord le cache devis/factures/courriels
 * déjà chargé (navigation rapide), puis bascule sur la liste complète.
 */
export function useDocumentsList(
  cabinetScope?: "conseil" | "expertise_fiscale",
) {
  const full = useDocuments(undefined, cabinetScope);
  const invoices = useDocuments("invoice", cabinetScope);
  const quotations = useDocuments("quotation", cabinetScope);
  const letters = useDocuments("letter", cabinetScope);

  const partialReady = Boolean(
    invoices.data || quotations.data || letters.data,
  );
  const partial = mergeDocumentsById([
    ...(invoices.data ?? []),
    ...(quotations.data ?? []),
    ...(letters.data ?? []),
  ]);

  return {
    data: full.data ?? (partialReady ? partial : []),
    isPending: full.isPending && !partialReady,
    isFetching: full.isFetching,
  };
}

export function useAllDocuments(
  type?: DocumentType,
  cabinetScope?: "conseil" | "expertise_fiscale",
) {
  const full = useQuery({
    queryKey: type
      ? ([...allDocumentsKey, type, cabinetScope ?? "active"] as const)
      : ([...allDocumentsKey, cabinetScope ?? "active"] as const),
    queryFn: () =>
      listAllDocuments({
        data: { type, ...(cabinetScope ? { cabinetScope } : {}) },
      }),
    staleTime: 60_000,
  });

  const invoices = useDocuments("invoice", cabinetScope);
  const quotations = useDocuments("quotation", cabinetScope);
  const letters = useDocuments("letter", cabinetScope);

  if (type === "invoice") {
    return {
      ...full,
      data: full.data ?? invoices.data,
      isPending: full.isPending && !invoices.data,
    };
  }
  if (type === "quotation") {
    return {
      ...full,
      data: full.data ?? quotations.data,
      isPending: full.isPending && !quotations.data,
    };
  }
  if (type === "letter") {
    return {
      ...full,
      data: full.data ?? letters.data,
      isPending: full.isPending && !letters.data,
    };
  }

  const partialReady = Boolean(invoices.data || quotations.data || letters.data);
  const partial = mergeDocumentsById([
    ...(invoices.data ?? []),
    ...(quotations.data ?? []),
    ...(letters.data ?? []),
  ]);

  return {
    ...full,
    data: full.data ?? (partialReady ? partial : undefined),
    isPending: full.isPending && !partialReady,
  };
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["document", id],
    queryFn: () => getDocument({ data: { id } }),
    enabled: !!id,
    staleTime: 60_000,
  });
}

/** Aperçu du prochain numéro FA/DV (création uniquement). */
export function usePeekNextDocumentNumber(
  type: "invoice" | "quotation" | undefined,
  issueDate: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["peek-document-number", type, issueDate],
    queryFn: () =>
      peekNextDocumentNumber({
        data: { type: type!, issueDate },
      }),
    enabled: enabled && !!type && !!issueDate,
    staleTime: 5_000,
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
      qc.invalidateQueries({ queryKey: ["peek-document-number"] });
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

export const mailsKey = ["mails"] as const;

export function useMails(direction: "outbound" | "inbound" | "all" = "all") {
  const { data: session } = useSession();
  const cabinet = session?.activeCabinet ?? "expertise_fiscale";
  return useQuery({
    queryKey: [...mailsKey, cabinet, direction],
    queryFn: () => listMails({ data: { direction, limit: 80 } }),
    staleTime: 60_000,
    enabled: Boolean(session),
  });
}

export function useMail(id: string | null) {
  const { data: session } = useSession();
  const cabinet = session?.activeCabinet ?? "expertise_fiscale";
  return useQuery({
    queryKey: [...mailsKey, cabinet, "detail", id],
    queryFn: () => getMail({ data: { id: id! } }),
    enabled: Boolean(id) && Boolean(session),
  });
}

export function useSyncMails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncInboundMails(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mailsKey });
      void qc.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}

export function useClearMailHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clearMailHistory(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mailsKey });
    },
  });
}

export function useSendDocumentEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | Document) => {
      if (typeof input === "string") {
        return sendDocumentEmail({ data: { id: input } });
      }
      const built = await buildDocumentPdfFromDoc(input, { omitSignature: false });
      return sendDocumentEmail({
        data: {
          id: input.id,
          pdfBase64: built.base64,
          fileName: built.fileName,
        },
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: documentsKey() });
      qc.invalidateQueries({ queryKey: documentsKey(res.type) });
      qc.invalidateQueries({ queryKey: ["document", res.documentId] });
      qc.invalidateQueries({ queryKey: notificationsKey });
      qc.invalidateQueries({ queryKey: documentPdfTracesKey(res.documentId) });
      void qc.invalidateQueries({ queryKey: mailsKey });
    },
  });
}

export function useDocumentPdfTraces(documentId: string | undefined) {
  return useQuery({
    queryKey: documentPdfTracesKey(documentId ?? ""),
    queryFn: () => listDocumentPdfTraces({ data: { documentId: documentId! } }),
    enabled: Boolean(documentId),
  });
}

export function useDownloadDocumentPdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      doc,
      includeSignature,
    }: {
      doc: Document;
      includeSignature?: boolean;
    }) => downloadDocumentPdf(doc, { includeSignature }),
    onSuccess: (_res, vars) => {
      if (vars.doc.id && !vars.includeSignature) {
        void qc.invalidateQueries({ queryKey: documentPdfTracesKey(vars.doc.id) });
      }
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDocument({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["documents"] });
      void qc.invalidateQueries({ queryKey: allDocumentsKey });
    },
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

export function useUploadCompanySignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      base64: string;
      contentType: "image/png" | "image/jpeg" | "image/webp";
      fileName?: string;
    }) => uploadCompanySignature({ data: payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: companyKey });
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: notificationsKey,
    queryFn: () => listNotifications(),
    staleTime: 30_000,
    refetchInterval: POLL_MS,
  });
}

export const adminRequestsKey = ["admin-requests"] as const;
export const cabinetStaffKey = ["cabinet-staff"] as const;

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

export const letterSignatureKey = (documentId: string) =>
  ["letter-signature", documentId] as const;

export function useLetterSignatureRequest(documentId: string | undefined) {
  return useQuery({
    queryKey: letterSignatureKey(documentId ?? ""),
    queryFn: () =>
      getLetterSignatureRequest({ data: { documentId: documentId! } }),
    enabled: Boolean(documentId),
  });
}

export function useRequestLetterSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      requestLetterSignature({ data: { documentId } }),
    onSuccess: (req) => {
      void qc.invalidateQueries({ queryKey: letterSignatureKey(req.documentId) });
      void qc.invalidateQueries({ queryKey: ["document", req.documentId] });
      void qc.invalidateQueries({ queryKey: documentsKey("letter") });
      void qc.invalidateQueries({ queryKey: documentsKey("invoice") });
      void qc.invalidateQueries({ queryKey: documentsKey("quotation") });
      void qc.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}

export function useSignLetterDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      signLetterDocument({
        data: { documentId, previewConfirmed: true },
      }),
    onSuccess: (_res, documentId) => {
      void qc.invalidateQueries({ queryKey: letterSignatureKey(documentId) });
      void qc.invalidateQueries({ queryKey: ["document", documentId] });
      void qc.invalidateQueries({ queryKey: documentsKey("letter") });
      void qc.invalidateQueries({ queryKey: documentsKey("invoice") });
      void qc.invalidateQueries({ queryKey: documentsKey("quotation") });
      void qc.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}

export function useRejectLetterSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { documentId: string; note?: string }) =>
      rejectLetterSignature({ data: payload }),
    onSuccess: (_res, payload) => {
      void qc.invalidateQueries({
        queryKey: letterSignatureKey(payload.documentId),
      });
      void qc.invalidateQueries({ queryKey: ["document", payload.documentId] });
      void qc.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}
