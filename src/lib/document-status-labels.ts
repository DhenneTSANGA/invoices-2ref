import type { DocumentStatus, DocumentType, NotificationItem } from "@/store/types";

const statusLabels: Record<DocumentStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  paid: "Payé",
  overdue: "En retard",
  archived: "Archivé",
  cancelled: "Annulé",
};

const typeLabels: Record<DocumentType, string> = {
  invoice: "Facture",
  quotation: "Devis",
  proforma: "Pro forma",
  letter: "Lettre",
};

export function documentStatusLabel(status: DocumentStatus): string {
  return statusLabels[status];
}

export function documentTypeLabel(type: DocumentType): string {
  return typeLabels[type];
}

export function notificationTypeForStatus(
  status: DocumentStatus,
): NotificationItem["type"] {
  if (status === "paid" || status === "accepted") return "success";
  if (status === "overdue" || status === "rejected") return "danger";
  if (status === "cancelled") return "warning";
  return "info";
}
