import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session.functions";
import { resolveLeadOwner } from "@/lib/crm-lead-routing";
import { staffDisplayName } from "@/lib/prospection-managers";

/**
 * Remontée de pistes internes (cahier des charges §4–5) : ouverte à tous les
 * collaborateurs, y compris ceux sans accès à l’espace Prospection.
 * La piste est attribuée automatiquement au manager référent.
 */
export const submitInternalLead = createServerFn({ method: "POST" })
  .validator(
    z.object({
      companyName: z.string().trim().min(1, "Indiquez le client"),
      clientId: z.string().optional(),
      line: z.enum(["rh", "comptabilite", "conseil", "fiscalite", "formation"]),
      need: z.string().trim().min(1, "Décrivez le besoin détecté"),
      comment: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await getCurrentSession();
    if (!session) throw new Error("Non authentifié");
    const { staff } = session;

    const routed = await resolveLeadOwner({
      line: data.line,
      companyName: data.companyName,
      clientId: data.clientId,
    });
    if (!routed.ownerId) {
      throw new Error(
        "Aucun manager Prospection n’est configuré — contactez un administrateur.",
      );
    }

    const author = staffDisplayName(staff);
    const lead = await prisma.crmLead.create({
      data: {
        companyName: data.companyName.trim(),
        companyId: routed.companyId,
        line: data.line,
        need: data.need.trim(),
        comment: data.comment?.trim() ?? "",
        ownerId: routed.ownerId,
        author,
        authorId: staff.id,
      },
    });

    if (routed.ownerId !== staff.id) {
      await prisma.crmNotification.create({
        data: {
          staffId: routed.ownerId,
          title: "Nouvelle piste interne",
          body: `${lead.companyName} — ${lead.need} (signalée par ${author})`,
          href: "/prospection/pistes",
        },
      });
    }

    const owner = await prisma.staffMember.findUnique({
      where: { id: routed.ownerId },
      select: { firstName: true, lastName: true, email: true },
    });
    return { ok: true as const, ownerName: owner ? staffDisplayName(owner) : "le manager" };
  });
