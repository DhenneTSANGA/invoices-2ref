import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  documentStatusLabel,
  documentTypeLabel,
  notificationTypeForStatus,
} from "@/lib/document-status-labels";
import type { DocumentStatus, DocumentType } from "@/store/types";

type BroadcastArgs = {
  actorStaffId: string;
  actorName: string;
  documentId: string;
  documentNumber: string;
  documentType: DocumentType;
  previousStatus: DocumentStatus;
  nextStatus: DocumentStatus;
};

export async function broadcastDocumentStatusChange(
  args: BroadcastArgs,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  if (args.previousStatus === args.nextStatus) return;

  const recipients = await db.staffMember.findMany({
    where: { id: { not: args.actorStaffId } },
    select: { id: true },
  });

  if (recipients.length === 0) return;

  const typeLabel = documentTypeLabel(args.documentType);
  const prevLabel = documentStatusLabel(args.previousStatus);
  const nextLabel = documentStatusLabel(args.nextStatus);
  const notifType = notificationTypeForStatus(args.nextStatus);

  await db.notification.createMany({
    data: recipients.map((r) => ({
      staffId: r.id,
      documentId: args.documentId,
      title: `${typeLabel} ${args.documentNumber} — ${nextLabel}`,
      body: `${args.actorName} a mis à jour le statut : ${prevLabel} → ${nextLabel}`,
      type: notifType,
    })),
  });
}

export function staffDisplayName(staff: {
  firstName: string;
  lastName: string;
}): string {
  return `${staff.firstName} ${staff.lastName}`.trim();
}
