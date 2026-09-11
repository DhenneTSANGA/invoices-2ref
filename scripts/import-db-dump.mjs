/**
 * Importe un dump JSON (export-db-dump.mjs) dans la base pointée par DATABASE_URL.
 *
 * Prérequis :
 *   1. Nouvelle base avec migrations Prisma appliquées (schéma à jour)
 *   2. Fichier data/db-dump.json (ou --in=…)
 *
 * Auth / fichiers :
 *   - Pas d’import Auth : recrée les users comme d’habitude
 *   - Pas d’import Storage : re-upload logos, signatures, fiches, PDF
 *
 * Options :
 *   --in=data/db-dump.json
 *   --force                 vide les tables métier avant import (DANGER)
 *   --skip-staff            n’insère pas staff_members (déjà créés via invitations)
 *   --remap-staff-by-email  réécrit les FK staff (id dump → id cible, match email)
 *
 * Exemples :
 *   # Import complet (conserve les IDs staff du dump)
 *   pnpm exec node scripts/import-db-dump.mjs --force
 *
 *   # Users déjà invités sur la nouvelle plateforme (IDs Auth différents)
 *   pnpm exec node scripts/import-db-dump.mjs --force --skip-staff --remap-staff-by-email
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const inArg = process.argv.find((a) => a.startsWith("--in="));
const inPath = path.resolve(
  inArg ? inArg.slice("--in=".length) : "data/db-dump.json",
);
const force = process.argv.includes("--force");
const skipStaff = process.argv.includes("--skip-staff");
const remapStaffByEmail = process.argv.includes("--remap-staff-by-email");

const prisma = new PrismaClient();

function asDate(value) {
  if (value == null || value === "") return null;
  return new Date(value);
}

function mapStaffId(id, staffMap) {
  if (id == null) return null;
  if (!remapStaffByEmail) return id;
  const next = staffMap.get(id);
  if (!next) {
    throw new Error(
      `Staff introuvable pour remap id=${id}. Invitez d’abord l’utilisateur (même email) ou importez sans --remap-staff-by-email.`,
    );
  }
  return next;
}

async function createMany(label, model, rows, chunkSize = 200) {
  if (!rows?.length) {
    console.log(`  · ${label}: 0`);
    return;
  }
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await model.createMany({ data: chunk, skipDuplicates: true });
  }
  console.log(`  · ${label}: ${rows.length}`);
}

async function wipeBusinessTables() {
  console.log("Vidage des tables (--force)…");
  // Ordre inverse des FK
  await prisma.documentPdfTrace.deleteMany();
  await prisma.letterSignatureRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.documentLine.deleteMany();
  await prisma.documentSection.deleteMany();
  await prisma.adminRequest.deleteMany();
  await prisma.mailMessage.deleteMany();
  await prisma.activity.deleteMany();
  // documents : casser self-FK puis delete
  await prisma.document.updateMany({
    data: { subscriptionOfId: null, mailMergeCampaignId: null },
  });
  await prisma.document.deleteMany();
  await prisma.mailMergeCampaign.deleteMany();
  await prisma.service.deleteMany();
  await prisma.client.deleteMany();
  await prisma.revokedAccount.deleteMany();
  if (!skipStaff) {
    await prisma.staffMember.deleteMany();
  }
  await prisma.company.deleteMany();
  console.log("  tables vidées");
}

async function main() {
  if (!fs.existsSync(inPath)) {
    throw new Error(`Fichier introuvable: ${inPath}`);
  }

  const dump = JSON.parse(fs.readFileSync(inPath, "utf8"));
  console.log("Import depuis", inPath);
  console.log("Exporté le", dump.meta?.exportedAt ?? "?");
  if (dump.meta?.counts) console.table(dump.meta.counts);

  if (!force) {
    const existingDocs = await prisma.document.count();
    const existingClients = await prisma.client.count();
    if (existingDocs > 0 || existingClients > 0) {
      throw new Error(
        `La base cible n’est pas vide (clients=${existingClients}, documents=${existingDocs}). Relancez avec --force pour écraser, ou utilisez une base neuve.`,
      );
    }
  } else {
    await wipeBusinessTables();
  }

  /** @type {Map<string, string>} oldStaffId → newStaffId */
  const staffMap = new Map();

  if (remapStaffByEmail) {
    const targetStaff = await prisma.staffMember.findMany({
      select: { id: true, email: true },
    });
    const byEmail = new Map(
      targetStaff.map((s) => [s.email.toLowerCase(), s.id]),
    );
    for (const s of dump.staffMembers ?? []) {
      const next = byEmail.get(String(s.email).toLowerCase());
      if (next) staffMap.set(s.id, next);
      else
        console.warn(
          `  ! Pas de staff cible pour ${s.email} — documents liés échoueront au remap`,
        );
    }
    console.log(`Remap staff: ${staffMap.size}/${(dump.staffMembers ?? []).length}`);
  } else {
    for (const s of dump.staffMembers ?? []) staffMap.set(s.id, s.id);
  }

  console.log("Insertion…");

  await createMany(
    "companies",
    prisma.company,
    (dump.companies ?? []).map((r) => ({
      ...r,
      createdAt: asDate(r.createdAt),
      updatedAt: asDate(r.updatedAt),
    })),
  );

  if (!skipStaff) {
    await createMany(
      "staffMembers",
      prisma.staffMember,
      (dump.staffMembers ?? []).map((r) => ({
        ...r,
        createdAt: asDate(r.createdAt),
        updatedAt: asDate(r.updatedAt),
      })),
    );
  } else {
    console.log("  · staffMembers: skip (--skip-staff)");
  }

  await createMany(
    "revokedAccounts",
    prisma.revokedAccount,
    (dump.revokedAccounts ?? []).map((r) => ({
      ...r,
      revokedAt: asDate(r.revokedAt),
    })),
  );

  await createMany(
    "clients",
    prisma.client,
    (dump.clients ?? []).map((r) => ({
      ...r,
      createdById: mapStaffId(r.createdById, staffMap),
      createdAt: asDate(r.createdAt),
      updatedAt: asDate(r.updatedAt),
    })),
  );

  await createMany(
    "services",
    prisma.service,
    (dump.services ?? []).map((r) => ({
      ...r,
      createdById: mapStaffId(r.createdById, staffMap),
      unitPrice: r.unitPrice,
      vatRate: r.vatRate,
      createdAt: asDate(r.createdAt),
      updatedAt: asDate(r.updatedAt),
    })),
  );

  await createMany(
    "mailMergeCampaigns",
    prisma.mailMergeCampaign,
    (dump.mailMergeCampaigns ?? []).map((r) => ({
      ...r,
      createdById: mapStaffId(r.createdById, staffMap),
      signedById: mapStaffId(r.signedById, staffMap),
      signatureRequestedById: mapStaffId(r.signatureRequestedById, staffMap),
      issueDate: asDate(r.issueDate),
      signedAt: asDate(r.signedAt),
      signatureRequestedAt: asDate(r.signatureRequestedAt),
      signatureRejectedAt: asDate(r.signatureRejectedAt),
      sentAt: asDate(r.sentAt),
      createdAt: asDate(r.createdAt),
      updatedAt: asDate(r.updatedAt),
    })),
  );

  // Pass 1 documents : sans self-FK subscriptionOfId
  const documents = dump.documents ?? [];
  await createMany(
    "documents (pass 1)",
    prisma.document,
    documents.map((r) => ({
      ...r,
      clientId: r.clientId,
      createdById: mapStaffId(r.createdById, staffMap),
      subscriptionOfId: null,
      mailMergeCampaignId: r.mailMergeCampaignId ?? null,
      issueDate: asDate(r.issueDate),
      dueDate: asDate(r.dueDate),
      subscriptionNextAt: asDate(r.subscriptionNextAt),
      createdAt: asDate(r.createdAt),
      updatedAt: asDate(r.updatedAt),
    })),
  );

  // Pass 2 : subscriptionOfId
  let linked = 0;
  for (const r of documents) {
    if (!r.subscriptionOfId) continue;
    await prisma.document.update({
      where: { id: r.id },
      data: { subscriptionOfId: r.subscriptionOfId },
    });
    linked += 1;
  }
  if (linked) console.log(`  · documents subscriptionOfId: ${linked}`);

  await createMany(
    "documentSections",
    prisma.documentSection,
    dump.documentSections ?? [],
  );

  await createMany(
    "documentLines",
    prisma.documentLine,
    (dump.documentLines ?? []).map((r) => ({
      ...r,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      vatRate: r.vatRate,
      discount: r.discount,
      tpsRate: r.tpsRate,
      cssRate: r.cssRate,
    })),
  );

  await createMany(
    "activities",
    prisma.activity,
    (dump.activities ?? []).map((r) => ({
      ...r,
      at: asDate(r.at),
    })),
  );

  await createMany(
    "notifications",
    prisma.notification,
    (dump.notifications ?? []).map((r) => ({
      ...r,
      staffId: mapStaffId(r.staffId, staffMap),
      at: asDate(r.at),
    })),
  );

  await createMany(
    "adminRequests",
    prisma.adminRequest,
    (dump.adminRequests ?? []).map((r) => ({
      ...r,
      staffId: mapStaffId(r.staffId, staffMap),
      reviewedById: mapStaffId(r.reviewedById, staffMap),
      createdAt: asDate(r.createdAt),
      reviewedAt: asDate(r.reviewedAt),
    })),
  );

  await createMany(
    "letterSignatureRequests",
    prisma.letterSignatureRequest,
    (dump.letterSignatureRequests ?? []).map((r) => ({
      ...r,
      requestedById: mapStaffId(r.requestedById, staffMap),
      reviewedById: mapStaffId(r.reviewedById, staffMap),
      reviewedAt: asDate(r.reviewedAt),
      createdAt: asDate(r.createdAt),
      updatedAt: asDate(r.updatedAt),
    })),
  );

  await createMany(
    "mailMessages",
    prisma.mailMessage,
    (dump.mailMessages ?? []).map((r) => ({
      ...r,
      staffId: r.staffId ? mapStaffId(r.staffId, staffMap) : null,
      createdAt: asDate(r.createdAt),
    })),
  );

  // Traces PDF : URLs Storage souvent cassées après migration — on importe quand même l’historique
  await createMany(
    "documentPdfTraces",
    prisma.documentPdfTrace,
    (dump.documentPdfTraces ?? []).map((r) => ({
      ...r,
      staffId: mapStaffId(r.staffId, staffMap),
      createdAt: asDate(r.createdAt),
    })),
  );

  console.log("\nImport terminé.");
  console.log(
    "Rappel : recrée les users Auth (et re-upload fichiers). Si les UUID staff diffèrent, utilise --skip-staff --remap-staff-by-email.",
  );
}

main()
  .catch((err) => {
    console.error("Import échoué:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
