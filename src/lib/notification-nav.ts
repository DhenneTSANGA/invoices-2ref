/** Destination de navigation pour une notification. */
import type { NotificationItem } from "@/store/types";

export function notificationNavTarget(n: NotificationItem): {
  to:
    | "/mails"
    | "/documents"
    | "/notifications"
    | "/lettre/$id"
    | "/invoices/$id"
    | "/quotations/$id"
    | "/lettre/publipostage";
  params?: { id: string };
  search?: { focus: string; campaign?: string };
} {
  if (
    n.title === "Réponse e-mail reçue" ||
    n.title.toLowerCase().includes("réponse e-mail")
  ) {
    return { to: "/mails" };
  }

  const signatureRelated =
    n.title === "Demande de signature" ||
    n.title === "Document signé" ||
    n.title === "Courriel signé" ||
    n.title === "Signature refusée" ||
    n.title === "Publipostage — signature demandée" ||
    n.title === "Publipostage signé" ||
    n.title === "Publipostage — signature refusée" ||
    n.title.toLowerCase().includes("signature");

  if (n.title.toLowerCase().includes("publipostage")) {
    return { to: "/lettre/publipostage" };
  }

  if (n.documentId && signatureRelated) {
    if (n.documentType === "invoice") {
      return { to: "/invoices/$id", params: { id: n.documentId } };
    }
    if (n.documentType === "quotation") {
      return { to: "/quotations/$id", params: { id: n.documentId } };
    }
    return { to: "/lettre/$id", params: { id: n.documentId } };
  }

  if (n.documentId) {
    if (n.documentType === "invoice") {
      return { to: "/invoices/$id", params: { id: n.documentId } };
    }
    if (n.documentType === "quotation") {
      return { to: "/quotations/$id", params: { id: n.documentId } };
    }
    if (n.documentType === "letter") {
      return { to: "/lettre/$id", params: { id: n.documentId } };
    }
    return { to: "/documents", search: { focus: n.documentId } };
  }
  return { to: "/notifications" };
}
