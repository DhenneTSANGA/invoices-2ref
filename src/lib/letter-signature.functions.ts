import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatPrismaError } from "@/lib/prisma-errors";
import { getCurrentSession } from "@/lib/session.functions";
import { isAdmin, isSuperAdmin, canWriteDocument } from "@/lib/roles";
import { isAccountantSignatory } from "@/lib/signatory";
import { companyForPreview } from "@/lib/company-defaults";
import { staffDisplayName } from "@/lib/notify-document-status";
import { documentTypeLabel } from "@/lib/document-status-labels";
import type { DocumentType } from "@/store/types";

async function requireSession() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  return session;
}

const SIGNABLE_TYPES = ["letter", "invoice", "quotation"] as const;
type SignableType = (typeof SIGNABLE_TYPES)[number];

function isSignableType(type: string): type is SignableType {
  return (SIGNABLE_TYPES as readonly string[]).includes(type);
}

export type LetterSignatureRequestView = {
  id: string;
  documentId: string;
  status: "pending" | "accepted" | "rejected";
  requestedById: string;
  requestedByName: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  note: string | null;
  createdAt: string;
};

function mapRequest(row: {
  id: string;
  documentId: string;
  status: "pending" | "accepted" | "rejected";
  requestedById: string;
  reviewedById: string | null;
  reviewedAt: Date | null;
  note: string | null;
  createdAt: Date;
  requestedBy: { firstName: string; lastName: string };
}): LetterSignatureRequestView {
  return {
    id: row.id,
    documentId: row.documentId,
    status: row.status,
    requestedById: row.requestedById,
    requestedByName: `${row.requestedBy.firstName} ${row.requestedBy.lastName}`.trim(),
    reviewedById: row.reviewedById,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Admins du cabinet + super admins (hors acteur). */
async function notifySignatureAudience(args: {
  actorStaffId: string;
  cabinet: "conseil" | "expertise_fiscale";
  documentId: string;
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "danger";
  alsoStaffIds?: string[];
}) {
  const admins = await prisma.staffMember.findMany({
    where: {
      id: { not: args.actorStaffId },
      OR: [
        { role: "super_admin" },
        { role: "admin", cabinet: args.cabinet },
      ],
    },
    select: { id: true },
  });

  const ids = new Set(admins.map((a) => a.id));
  for (const id of args.alsoStaffIds ?? []) {
    if (id !== args.actorStaffId) ids.add(id);
  }

  if (ids.size === 0) return;

  await prisma.notification.createMany({
    data: [...ids].map((staffId) => ({
      staffId,
      documentId: args.documentId,
      cabinet: args.cabinet,
      title: args.title,
      body: args.body,
      type: args.type,
    })),
  });
}

async function loadSignableDoc(args: {
  documentId: string;
  role: string;
  activeCabinet: "conseil" | "expertise_fiscale";
  includeCreatedBy?: boolean;
}) {
  const doc = await prisma.document.findFirst({
    where: isSuperAdmin(args.role as "super_admin")
      ? { id: args.documentId }
      : { id: args.documentId, cabinet: args.activeCabinet },
    include: args.includeCreatedBy ? { createdBy: true } : undefined,
  });
  if (!doc) throw new Error("Document introuvable");
  if (!isSignableType(doc.type)) {
    throw new Error("Ce type de document ne prend pas en charge la signature en ligne");
  }
  return doc;
}

export const getLetterSignatureRequest = createServerFn({ method: "GET" })
  .validator(z.object({ documentId: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession();
    await loadSignableDoc({
      documentId: data.documentId,
      role: session.staff.role,
      activeCabinet: session.activeCabinet,
    });

    const row = await prisma.letterSignatureRequest.findFirst({
      where: { documentId: data.documentId },
      include: { requestedBy: true },
      orderBy: { createdAt: "desc" },
    });
    return row ? mapRequest(row) : null;
  });

/** Demande la signature du gérant / admin (courriel, facture ou devis). */
export const requestLetterSignature = createServerFn({ method: "POST" })
  .validator(z.object({ documentId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireSession();
      const { staff, activeCabinet } = session;

      const doc = await loadSignableDoc({
        documentId: data.documentId,
        role: staff.role,
        activeCabinet,
      });
      if (!canWriteDocument(staff.role, staff.id, doc.createdById)) {
        throw new Error("Accès refusé");
      }
      if (doc.status === "signed" || doc.status === "sent" || doc.status === "paid") {
        throw new Error("Ce document est déjà signé ou finalisé");
      }
      if (doc.status === "cancelled") {
        throw new Error("Document annulé");
      }
      if (isAccountantSignatory(doc.signatoryTitle)) {
        throw new Error(
          "Document Chef comptable : utilisez le PDF pour paraphe manuscrit (pas de signature en ligne).",
        );
      }

      const pending = await prisma.letterSignatureRequest.findFirst({
        where: { documentId: doc.id, status: "pending" },
        include: { requestedBy: true },
      });
      if (pending) return mapRequest(pending);

      const row = await prisma.letterSignatureRequest.create({
        data: {
          documentId: doc.id,
          cabinet: doc.cabinet,
          requestedById: staff.id,
          status: "pending",
        },
        include: { requestedBy: true },
      });

      const label = documentTypeLabel(doc.type as DocumentType).toLowerCase();
      await notifySignatureAudience({
        actorStaffId: staff.id,
        cabinet: doc.cabinet,
        documentId: doc.id,
        title: "Demande de signature",
        body: `${staffDisplayName(staff)} demande votre signature sur ${label} ${doc.number}. Ouvrez le document pour le relire avant de signer.`,
        type: "warning",
      });

      return mapRequest(row);
    } catch (err) {
      throw new Error(
        formatPrismaError(err, "Impossible d’envoyer la demande de signature"),
      );
    }
  });

/**
 * Admin / SA signe après avoir consulté le document.
 * Applique le cachet cabinet (stampUrl + managerName) via le statut signed.
 */
export const signLetterDocument = createServerFn({ method: "POST" })
  .validator(
    z.object({
      documentId: z.string(),
      previewConfirmed: z.literal(true),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff, activeCabinet } = session;
    if (!isAdmin(staff.role)) {
      throw new Error("Seuls l’administrateur (gérant) ou le super admin peuvent signer");
    }

    const doc = await loadSignableDoc({
      documentId: data.documentId,
      role: staff.role,
      activeCabinet,
      includeCreatedBy: true,
    });
    if (!isSuperAdmin(staff.role) && doc.cabinet !== activeCabinet) {
      throw new Error("Ce document appartient à un autre cabinet");
    }
    if (doc.status === "signed" || doc.status === "sent" || doc.status === "paid") {
      throw new Error("Ce document est déjà signé ou finalisé");
    }
    if (doc.status === "cancelled") {
      throw new Error("Document annulé");
    }
    if (isAccountantSignatory(doc.signatoryTitle)) {
      throw new Error(
        "Document Chef comptable : utilisez le PDF pour paraphe manuscrit (pas de signature en ligne).",
      );
    }

    const company = companyForPreview(
      await prisma.company.findUnique({ where: { cabinet: doc.cabinet } }),
      doc.cabinet,
    );
    if (!company.managerName?.trim()) {
      throw new Error(
        "Configurez le nom du gérant dans Paramètres avant de signer.",
      );
    }

    const pending = await prisma.letterSignatureRequest.findFirst({
      where: { documentId: doc.id, status: "pending" },
    });

    await prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: doc.id },
        data: { status: "signed" },
      });
      if (pending) {
        await tx.letterSignatureRequest.update({
          where: { id: pending.id },
          data: {
            status: "accepted",
            reviewedAt: new Date(),
            reviewedById: staff.id,
          },
        });
      } else {
        await tx.letterSignatureRequest.create({
          data: {
            documentId: doc.id,
            cabinet: doc.cabinet,
            requestedById: staff.id,
            status: "accepted",
            reviewedAt: new Date(),
            reviewedById: staff.id,
            note: "Signature directe par l’administrateur",
          },
        });
      }
    });

    // Créateur + demandeur (souvent le même) : priorité à l’auteur du document
    const notifyIds = [doc.createdById];
    if (pending) notifyIds.push(pending.requestedById);
    const label = documentTypeLabel(doc.type as DocumentType).toLowerCase();

    await notifySignatureAudience({
      actorStaffId: staff.id,
      cabinet: doc.cabinet,
      documentId: doc.id,
      title: "Document signé",
      body: `${staffDisplayName(staff)} a signé ${label} ${doc.number}. Vous pouvez l’envoyer par e-mail, télécharger/imprimer le PDF, ou le conserver pour un envoi ultérieur.`,
      type: "success",
      alsoStaffIds: notifyIds,
    });

    return { ok: true as const, status: "signed" as const };
  });

export const rejectLetterSignature = createServerFn({ method: "POST" })
  .validator(
    z.object({
      documentId: z.string(),
      note: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { staff, activeCabinet } = session;
    if (!isAdmin(staff.role)) {
      throw new Error("Accès réservé aux administrateurs");
    }

    const doc = await loadSignableDoc({
      documentId: data.documentId,
      role: staff.role,
      activeCabinet,
    });

    const pending = await prisma.letterSignatureRequest.findFirst({
      where: { documentId: doc.id, status: "pending" },
    });
    if (!pending) throw new Error("Aucune demande de signature en attente");

    await prisma.letterSignatureRequest.update({
      where: { id: pending.id },
      data: {
        status: "rejected",
        reviewedAt: new Date(),
        reviewedById: staff.id,
        note: data.note?.trim() || null,
      },
    });

    await notifySignatureAudience({
      actorStaffId: staff.id,
      cabinet: doc.cabinet,
      documentId: doc.id,
      title: "Signature refusée",
      body: `${staffDisplayName(staff)} a refusé de signer ${doc.number}${
        data.note?.trim() ? ` : ${data.note.trim()}` : "."
      }`,
      type: "danger",
      alsoStaffIds: [pending.requestedById, doc.createdById],
    });

    return { ok: true as const };
  });

/** Annule les demandes pending (ex. après modification du contenu). */
export async function cancelPendingLetterSignatures(documentId: string) {
  await prisma.letterSignatureRequest.updateMany({
    where: { documentId, status: "pending" },
    data: {
      status: "rejected",
      reviewedAt: new Date(),
      note: "Annulée : le document a été modifié",
    },
  });
}
