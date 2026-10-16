import type { CrmServiceLine } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapStaff } from "@/lib/mappers";
import { crmRoleFromStaff } from "@/lib/prospection-access";
import { carriesPortfolio, isProspectionAssignableStaff } from "@/lib/prospection-managers";

/**
 * Manager référent d’une piste (cahier des charges §4–5) :
 * 1. manager de la fiche entreprise / client déjà en portefeuille ;
 * 2. sinon un manager dont le profil couvre la ligne de service ;
 * 3. sinon la direction (premier profil direction, puis super admin).
 */
export async function resolveLeadOwner(input: {
  line: CrmServiceLine;
  companyName: string;
  clientId?: string | null;
}): Promise<{ ownerId: string | null; companyId: string | null }> {
  const name = input.companyName.trim();
  const company =
    (input.clientId
      ? await prisma.crmCompany.findUnique({ where: { clientId: input.clientId } })
      : null) ??
    (name
      ? await prisma.crmCompany.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
          orderBy: { createdAt: "asc" },
        })
      : null);

  const staff = (await prisma.staffMember.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })).map(mapStaff);
  const assignable = staff.filter(isProspectionAssignableStaff);
  const assignableIds = new Set(assignable.map((s) => s.id));

  if (company?.managerId && assignableIds.has(company.managerId)) {
    return { ownerId: company.managerId, companyId: company.id };
  }

  const lineManager = assignable.find(
    (s) => carriesPortfolio(s) && (s.crmLines ?? []).includes(input.line),
  );
  const direction =
    assignable.find((s) => s.role === "admin" && crmRoleFromStaff(s) === "direction") ??
    assignable.find((s) => s.role === "super_admin");

  return {
    ownerId: lineManager?.id ?? direction?.id ?? assignable[0]?.id ?? null,
    companyId: company?.id ?? null,
  };
}
