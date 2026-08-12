import type { QueryClient } from "@tanstack/react-query";
import {
  clientsKey,
  companyKey,
  servicesKey,
  documentsKey,
  allDocumentsKey,
  notificationsKey,
  mailsKey,
  sessionKey,
  adminRequestsKey,
  cabinetStaffKey,
} from "@/hooks/use-data";
import {
  listClients,
  getCompany,
  listServices,
  listDocuments,
  listAllDocuments,
  listNotifications,
} from "@/lib/data.functions";
import { listMails } from "@/lib/mail.functions";
import {
  listAdminRequests,
  listCabinetStaff,
} from "@/lib/admin.functions";
import type { AppSession } from "@/lib/session.functions";

const LIST_STALE = 60_000;
const SLOW_STALE = 5 * 60_000;

function activeCabinet(queryClient: QueryClient) {
  const session = queryClient.getQueryData<AppSession>(sessionKey);
  return session?.activeCabinet ?? "expertise_fiscale";
}

/** Précharge les listes partagées (mêmes clés que les hooks). */
export function prefetchCommonAppData(queryClient: QueryClient) {
  void queryClient.prefetchQuery({
    queryKey: [...clientsKey, "active"] as const,
    queryFn: () => listClients(),
    staleTime: LIST_STALE,
  });
  void queryClient.prefetchQuery({
    queryKey: companyKey,
    queryFn: () => getCompany(),
    staleTime: SLOW_STALE,
  });
  void queryClient.prefetchQuery({
    queryKey: servicesKey,
    queryFn: () => listServices(),
    staleTime: SLOW_STALE,
  });
  void queryClient.prefetchQuery({
    queryKey: documentsKey(),
    queryFn: () => listDocuments({ data: {} }),
    staleTime: LIST_STALE,
  });
  void queryClient.prefetchQuery({
    queryKey: [...allDocumentsKey, "active"] as const,
    queryFn: () => listAllDocuments({ data: {} }),
    staleTime: LIST_STALE,
  });
  for (const type of ["invoice", "quotation", "letter"] as const) {
    void queryClient.prefetchQuery({
      queryKey: documentsKey(type),
      queryFn: () => listDocuments({ data: { type } }),
      staleTime: LIST_STALE,
    });
  }
  void queryClient.prefetchQuery({
    queryKey: notificationsKey,
    queryFn: () => listNotifications(),
    staleTime: 30_000,
  });
  const cabinet = activeCabinet(queryClient);
  void queryClient.prefetchQuery({
    queryKey: [...mailsKey, cabinet, "all"] as const,
    queryFn: () => listMails({ data: { direction: "all", limit: 80 } }),
    staleTime: 30_000,
  });
}

/** Prefetch ciblé selon la cible de navigation (survol sidebar). */
export function prefetchForNavPath(queryClient: QueryClient, to: string) {
  if (to.startsWith("http")) return;

  const ensureClients = () =>
    void queryClient.prefetchQuery({
      queryKey: [...clientsKey, "active"] as const,
      queryFn: () => listClients(),
      staleTime: LIST_STALE,
    });

  const ensureDocs = () =>
    void queryClient.prefetchQuery({
      queryKey: documentsKey(),
      queryFn: () => listDocuments({ data: {} }),
      staleTime: LIST_STALE,
    });

  const ensureServices = () =>
    void queryClient.prefetchQuery({
      queryKey: servicesKey,
      queryFn: () => listServices(),
      staleTime: SLOW_STALE,
    });

  if (
    to === "/clients" ||
    to === "/search" ||
    to === "/templates" ||
    to === "/archive" ||
    to === "/dashboard" ||
    to === "/home" ||
    to === "/lettre" ||
    to === "/lettre/publipostage"
  ) {
    ensureClients();
  }

  if (
    to === "/archive" ||
    to === "/search" ||
    to === "/dashboard" ||
    to === "/home"
  ) {
    ensureDocs();
    void queryClient.prefetchQuery({
      queryKey: documentsKey("invoice"),
      queryFn: () => listDocuments({ data: { type: "invoice" } }),
      staleTime: LIST_STALE,
    });
    void queryClient.prefetchQuery({
      queryKey: documentsKey("quotation"),
      queryFn: () => listDocuments({ data: { type: "quotation" } }),
      staleTime: LIST_STALE,
    });
  }

  if (to === "/search" || to === "/services") {
    ensureServices();
  }

  if (to === "/documents") {
    void queryClient.prefetchQuery({
      queryKey: [...allDocumentsKey, "active"] as const,
      queryFn: () => listAllDocuments({ data: {} }),
      staleTime: LIST_STALE,
    });
    ensureClients();
  }

  if (to === "/invoices") {
    void queryClient.prefetchQuery({
      queryKey: documentsKey("invoice"),
      queryFn: () => listDocuments({ data: { type: "invoice" } }),
      staleTime: LIST_STALE,
    });
  }

  if (to === "/quotations") {
    void queryClient.prefetchQuery({
      queryKey: documentsKey("quotation"),
      queryFn: () => listDocuments({ data: { type: "quotation" } }),
      staleTime: LIST_STALE,
    });
  }

  if (to === "/lettre") {
    void queryClient.prefetchQuery({
      queryKey: documentsKey("letter"),
      queryFn: () => listDocuments({ data: { type: "letter" } }),
      staleTime: LIST_STALE,
    });
  }

  if (to === "/mails") {
    const cabinet = activeCabinet(queryClient);
    void queryClient.prefetchQuery({
      queryKey: [...mailsKey, cabinet, "all"] as const,
      queryFn: () => listMails({ data: { direction: "all", limit: 80 } }),
      staleTime: 30_000,
    });
  }

  if (to === "/notifications") {
    void queryClient.prefetchQuery({
      queryKey: notificationsKey,
      queryFn: () => listNotifications(),
      staleTime: 30_000,
    });
  }

  if (to === "/settings" || to === "/profile") {
    void queryClient.prefetchQuery({
      queryKey: companyKey,
      queryFn: () => getCompany(),
      staleTime: SLOW_STALE,
    });
  }

  if (to === "/users") {
    void queryClient.prefetchQuery({
      queryKey: adminRequestsKey,
      queryFn: () => listAdminRequests(),
      staleTime: LIST_STALE,
    });
    void queryClient.prefetchQuery({
      queryKey: cabinetStaffKey,
      queryFn: () => listCabinetStaff(),
      staleTime: LIST_STALE,
    });
  }
}
