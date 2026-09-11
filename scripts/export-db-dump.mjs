/**
 * Exporte toutes les tables Prisma vers un JSON (sans Auth Supabase ni fichiers Storage).
 *
 * Usage (base source) :
 *   pnpm exec node scripts/export-db-dump.mjs
 *   pnpm exec node scripts/export-db-dump.mjs --out=data/db-dump.json
 *
 * Ensuite, sur la nouvelle base (après migrations) :
 *   pnpm exec node scripts/import-db-dump.mjs
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient, Prisma } from "@prisma/client";

const outArg = process.argv.find((a) => a.startsWith("--out="));
const outPath = path.resolve(
  outArg ? outArg.slice("--out=".length) : "data/db-dump.json",
);

const prisma = new PrismaClient();

function serializeValue(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Prisma.Decimal.isDecimal(value)) return value.toString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serializeValue(v);
    return out;
  }
  return value;
}

async function main() {
  console.log("Export en cours…");

  const [
    companies,
    staffMembers,
    revokedAccounts,
    adminRequests,
    clients,
    services,
    mailMergeCampaigns,
    documents,
    documentSections,
    documentLines,
    activities,
    notifications,
    letterSignatureRequests,
    mailMessages,
    documentPdfTraces,
  ] = await Promise.all([
    prisma.company.findMany({ orderBy: { cabinet: "asc" } }),
    prisma.staffMember.findMany({ orderBy: { email: "asc" } }),
    prisma.revokedAccount.findMany({ orderBy: { revokedAt: "asc" } }),
    prisma.adminRequest.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.client.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.service.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.mailMergeCampaign.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.document.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.documentSection.findMany({ orderBy: [{ documentId: "asc" }, { position: "asc" }] }),
    prisma.documentLine.findMany({ orderBy: [{ documentId: "asc" }, { position: "asc" }] }),
    prisma.activity.findMany({ orderBy: { at: "asc" } }),
    prisma.notification.findMany({ orderBy: { at: "asc" } }),
    prisma.letterSignatureRequest.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.mailMessage.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.documentPdfTrace.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const dump = {
    meta: {
      exportedAt: new Date().toISOString(),
      source: "2ref-auto prisma dump",
      note:
        "Sans Auth Supabase ni fichiers Storage. Recréer les users Auth, puis soit conserver les mêmes UUID staff, soit utiliser --remap-staff-by-email à l’import.",
      counts: {
        companies: companies.length,
        staffMembers: staffMembers.length,
        revokedAccounts: revokedAccounts.length,
        adminRequests: adminRequests.length,
        clients: clients.length,
        services: services.length,
        mailMergeCampaigns: mailMergeCampaigns.length,
        documents: documents.length,
        documentSections: documentSections.length,
        documentLines: documentLines.length,
        activities: activities.length,
        notifications: notifications.length,
        letterSignatureRequests: letterSignatureRequests.length,
        mailMessages: mailMessages.length,
        documentPdfTraces: documentPdfTraces.length,
      },
    },
    companies: serializeValue(companies),
    staffMembers: serializeValue(staffMembers),
    revokedAccounts: serializeValue(revokedAccounts),
    adminRequests: serializeValue(adminRequests),
    clients: serializeValue(clients),
    services: serializeValue(services),
    mailMergeCampaigns: serializeValue(mailMergeCampaigns),
    documents: serializeValue(documents),
    documentSections: serializeValue(documentSections),
    documentLines: serializeValue(documentLines),
    activities: serializeValue(activities),
    notifications: serializeValue(notifications),
    letterSignatureRequests: serializeValue(letterSignatureRequests),
    mailMessages: serializeValue(mailMessages),
    documentPdfTraces: serializeValue(documentPdfTraces),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), "utf8");

  console.log("OK →", outPath);
  console.table(dump.meta.counts);
}

main()
  .catch((err) => {
    console.error("Export échoué:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
