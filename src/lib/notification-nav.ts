import type { NotificationItem } from "@/store/types";

/** Destination de navigation pour une notification. */
export function notificationNavTarget(n: NotificationItem): {
  to: "/mails" | "/documents" | "/notifications" | "/lettre/$id";
  params?: { id: string };
  search?: { focus: string };
} {
  if (
    n.title === "Réponse e-mail reçue" ||
    n.title.toLowerCase().includes("réponse e-mail")
  ) {
    return { to: "/mails" };
  }

  const signatureRelated =
    n.title === "Demande de signature" ||
    n.title === "Courriel signé" ||
    n.title === "Signature refusée" ||
    n.title.toLowerCase().includes("signature");

  if (n.documentId && (n.documentType === "letter" || signatureRelated)) {
    return { to: "/lettre/$id", params: { id: n.documentId } };
  }

  if (n.documentId) {
    return { to: "/documents", search: { focus: n.documentId } };
  }
  return { to: "/notifications" };
}
