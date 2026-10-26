import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { LeadOrigin } from "@/lib/prospection-model";

/** Origine d'une piste + recommandant (colonnes lues / écrites en SQL brut). */
export type LeadOriginFields = {
  origin: LeadOrigin;
  referrerName: string;
  referrerContact: string;
  referrerRelation: string;
};

export const INTERNAL_LEAD_ORIGIN: LeadOriginFields = {
  origin: "interne",
  referrerName: "",
  referrerContact: "",
  referrerRelation: "",
};

export async function loadLeadOrigins(
  ids: string[],
): Promise<Map<string, LeadOriginFields>> {
  const map = new Map<string, LeadOriginFields>();
  if (ids.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<
      {
        id: string;
        origin: string;
        referrerName: string;
        referrerContact: string;
        referrerRelation: string;
      }[]
    >`
      SELECT id, origin, "referrerName", "referrerContact", "referrerRelation"
      FROM "crm_leads"
      WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) {
      map.set(row.id, {
        origin: row.origin === "externe" ? "externe" : "interne",
        referrerName: row.referrerName ?? "",
        referrerContact: row.referrerContact ?? "",
        referrerRelation: row.referrerRelation ?? "",
      });
    }
  } catch {
    /* colonnes absentes tant que la migration n’est pas appliquée */
  }
  return map;
}

/** Lève une erreur explicite si la migration des pistes externes manque. */
export async function persistLeadOrigin(id: string, fields: LeadOriginFields) {
  try {
    await prisma.$executeRaw`
      UPDATE "crm_leads"
      SET origin = ${fields.origin},
          "referrerName" = ${fields.referrerName},
          "referrerContact" = ${fields.referrerContact},
          "referrerRelation" = ${fields.referrerRelation}
      WHERE id = ${id}
    `;
  } catch (err) {
    console.error("[crm lead origin]", err);
    throw new Error(
      "Pistes externes indisponibles : la migration 20261026100000_crm_external_leads n’est pas encore appliquée en base.",
    );
  }
}

export function withLeadOrigin<T extends { id: string }>(
  lead: T,
  origins: Map<string, LeadOriginFields>,
): T & LeadOriginFields {
  return { ...lead, ...(origins.get(lead.id) ?? INTERNAL_LEAD_ORIGIN) };
}
