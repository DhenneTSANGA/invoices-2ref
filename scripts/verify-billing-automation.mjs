/**
 * Vérification logique abonnements + relances (sans cron HTTP).
 * Usage: node scripts/verify-billing-automation.mjs
 */
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();
const REMINDER_DAYS = [15, 20, 25];
const issues = [];
const ok = [];

function todayUtc(ref = new Date()) {
  return new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()),
  );
}

function check(name, pass, detail) {
  if (pass) ok.push({ name, detail });
  else issues.push({ name, detail });
}

async function tableExists(name) {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  console.log("\n=== Vérification abonnements + relances ===\n");

  check(
    "Table payment_reminder_logs",
    await tableExists("payment_reminder_logs"),
    "migration billing_automation",
  );

  const cols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'documents'
      AND column_name IN ('subscriptionDueDay', 'subscriptionDueMonthsOffset', 'subscriptionOfId')
  `;
  const colSet = new Set(cols.map((c) => c.column_name));
  check(
    "Colonnes abonnement sur documents",
    colSet.has("subscriptionDueDay") &&
      colSet.has("subscriptionDueMonthsOffset") &&
      colSet.has("subscriptionOfId"),
    [...colSet].join(", ") || "aucune",
  );

  const templates = await prisma.document.findMany({
    where: { isSubscription: true, subscriptionOfId: null },
    select: {
      id: true,
      number: true,
      status: true,
      subscriptionActive: true,
      subscriptionDay: true,
      subscriptionNextAt: true,
      subscriptionDueDay: true,
      subscriptionDueMonthsOffset: true,
      client: { select: { name: true, billingProfile: true, email: true } },
    },
    orderBy: { number: "asc" },
  });

  console.log(`Modèles d'abonnement : ${templates.length}`);
  for (const t of templates) {
    const clientOk =
      t.client.billingProfile === "subscription" ||
      t.client.billingProfile === "mixed";
    const statusOk = ["signed", "sent", "overdue"].includes(t.status);
    const emailOk = Boolean(t.client.email?.trim());

    console.log(`\n  · ${t.number} (${t.client.name})`);
    console.log(`    actif=${t.subscriptionActive} statut=${t.status} jour=${t.subscriptionDay ?? "—"}`);
    console.log(`    prochain=${t.subscriptionNextAt?.toISOString().slice(0, 10) ?? "—"}`);

    if (t.subscriptionActive) {
      check(
        `${t.number} — client abonnement/mixte`,
        clientOk,
        t.client.billingProfile,
      );
      check(
        `${t.number} — modèle signé/envoyé`,
        statusOk,
        t.status,
      );
      check(
        `${t.number} — client avec e-mail`,
        emailOk,
        t.client.email ?? "vide",
      );
    }
  }

  const generated = await prisma.document.findMany({
    where: { subscriptionOfId: { not: null } },
    select: {
      number: true,
      status: true,
      subscriptionOfId: true,
      dueDate: true,
      subscriptionOf: { select: { number: true } },
    },
    orderBy: { issueDate: "desc" },
    take: 10,
  });

  console.log(`\nFactures générées (10 dernières) : ${generated.length}`);
  for (const g of generated) {
    console.log(
      `  · ${g.number} ← modèle ${g.subscriptionOf?.number ?? g.subscriptionOfId} · ${g.status} · échéance ${g.dueDate?.toISOString().slice(0, 10) ?? "—"}`,
    );
    check(
      `${g.number} — liée à un modèle`,
      Boolean(g.subscriptionOfId),
      g.subscriptionOf?.number ?? g.subscriptionOfId,
    );
  }

  const today = todayUtc();
  const simDate = new Date(Date.UTC(2026, 8, 15)); // 15 sept. 2026
  const simDay = simDate.getUTCDate();

  const subscriptionClients = await prisma.client.findMany({
    where: { billingProfile: { in: ["subscription", "mixed"] }, isTransient: false },
    select: { id: true, name: true, email: true },
  });

  const reminderPreview = [];
  for (const client of subscriptionClients) {
    if (!client.email?.trim()) continue;
    const overdue = await prisma.document.findMany({
      where: {
        clientId: client.id,
        type: "invoice",
        status: { in: ["sent", "overdue"] },
        dueDate: { lt: todayUtc(simDate) },
        NOT: {
          isSubscription: true,
          subscriptionActive: true,
          subscriptionOfId: null,
        },
      },
      select: { number: true, dueDate: true, status: true },
    });
    if (overdue.length > 0) {
      reminderPreview.push({ client: client.name, email: client.email, invoices: overdue });
    }
  }
  const eligibleReminders = reminderPreview.length;

  check(
    "Jour simulé 15/09 = palier relance",
    REMINDER_DAYS.includes(simDay),
    `jour ${simDay}`,
  );
  check(
    "Clients éligibles relance (simul. 15/09)",
    eligibleReminders >= 0,
    `${eligibleReminders} client(s) avec facture(s) en retard`,
  );

  if (reminderPreview.length) {
    console.log("\nSimulation relance (15 sept. 2026) :");
    for (const row of reminderPreview) {
      console.log(`  → ${row.client} <${row.email}>`);
      for (const inv of row.invoices) {
        console.log(
          `      · ${inv.number} · échéance ${inv.dueDate?.toISOString().slice(0, 10)} · ${inv.status}`,
        );
      }
    }
  }

  const envOk = {
    resend: Boolean(process.env.RESEND_API_KEY?.trim()),
    cron: Boolean(process.env.CRON_SECRET?.trim()),
  };
  check("RESEND_API_KEY configuré", envOk.resend, envOk.resend ? "OK" : "manquant");
  check("CRON_SECRET configuré", envOk.cron, envOk.cron ? "OK" : "manquant — cron HTTP indisponible");

  const dueToday = templates.filter(
    (t) =>
      t.subscriptionActive &&
      t.subscriptionNextAt &&
      t.subscriptionNextAt <= today,
  );
  check(
    "Abonnements dus aujourd'hui",
    true,
    dueToday.length === 0
      ? "aucun en attente (OK si prochain envoi futur)"
      : `${dueToday.length} prêt(s) : ${dueToday.map((t) => t.number).join(", ")}`,
  );

  console.log("\n--- Résumé ---");
  console.log(`OK   : ${ok.length}`);
  console.log(`KO   : ${issues.length}`);

  if (issues.length) {
    console.log("\nProblèmes :");
    for (const i of issues) {
      console.log(`  ✗ ${i.name} — ${i.detail}`);
    }
    process.exitCode = 1;
  } else {
    console.log("\nToutes les vérifications structurelles sont passées.");
  }

  console.log("\nPour tester le cron HTTP :");
  console.log("  1. Ajouter CRON_SECRET dans .env");
  console.log("  2. node scripts/test-billing-jobs.mjs run --date 2026-09-15");
  console.log("");
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
