import type { NotificationItem } from "@/store/types";

/** Destination de navigation pour une notification. */
export function notificationNavTarget(n: NotificationItem): {
  to: "/mails" | "/documents" | "/notifications";
  search?: { focus: string };
} {
  if (
    n.title === "Réponse e-mail reçue" ||
    n.title.toLowerCase().includes("réponse e-mail")
  ) {
    return { to: "/mails" };
  }
  if (n.documentId) {
    return { to: "/documents", search: { focus: n.documentId } };
  }
  return { to: "/notifications" };
}
