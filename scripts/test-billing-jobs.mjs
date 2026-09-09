/**
 * Test abonnements + relances (sans alias @/).
 *
 * Usage:
 *   node scripts/test-billing-jobs.mjs status
 *   node scripts/test-billing-jobs.mjs run
 *   node scripts/test-billing-jobs.mjs run --date 2026-09-15
 *   node scripts/test-billing-jobs.mjs run --url http://localhost:8080
 */
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();
const REMINDER_DAYS = [15, 20, 25];

function todayUtc(ref = new Date()) {
  return new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()),
  );
}

function parseArgs(argv) {
  const cmd = argv[0] ?? "status";
  const dateIdx = argv.indexOf("--date");
  const urlIdx = argv.indexOf("--url");
  return {
    cmd,
    refDate: dateIdx >= 0 ? argv[dateIdx + 1] : undefined,
    baseUrl:
      urlIdx >= 0
        ? argv[urlIdx + 1]
        : process.env.APP_URL ?? "http://localhost:8080",
  };
}

async function printStatus() {
  const today = todayUtc();

  const dueTemplates = await prisma.document.findMany({
    where: {
      type: "invoice",
      isSubscription: true,
      subscriptionActive: true,
      subscriptionNextAt: { lte: today },
    },
    select: {
      number: true,
      subscriptionNextAt: true,
      client: { select: { name: true, billingProfile: true, email: true } },
    },
  });

  const subscriptionClients = await prisma.client.findMany({
    where: { billingProfile: { in: ["subscription", "mixed"] }, isTransient: false },
    select: { id: true, name: true, email: true, billingProfile: true },
  });

  const overdueByClient = [];
  for (const client of subscriptionClients) {
    const overdue = await prisma.document.findMany({
      where: {
        clientId: client.id,
        type: "invoice",
        status: { in: ["sent", "overdue"] },
        dueDate: { lt: today },
      },
      select: { number: true, dueDate: true, status: true, total: true },
      orderBy: { dueDate: "asc" },
    });
    if (overdue.length > 0) {
      overdueByClient.push({ client, overdue });
    }
  }

  const day = today.getUTCDate();
  const reminderToday = REMINDER_DAYS.includes(day);

  console.log("\n=== État facturation automatique ===\n");
  console.log(`Date du jour (UTC) : ${today.toISOString().slice(0, 10)}`);
  console.log(`Jour de relance aujourd'hui ? ${reminderToday ? "oui" : "non"} (paliers : 15, 20, 25)\n`);

  console.log(`Abonnements dus (subscriptionNextAt ≤ aujourd'hui) : ${dueTemplates.length}`);
  for (const t of dueTemplates) {
    console.log(
      `  - ${t.number} → ${t.client.name} (prochain : ${t.subscriptionNextAt?.toISOString().slice(0, 10) ?? "—"})`,
    );
  }

  console.log(`\nClients abonnement/mixte avec factures en retard : ${overdueByClient.length}`);
  for (const row of overdueByClient) {
    console.log(`  - ${row.client.name} <${row.client.email ?? "sans e-mail"}>`);
    for (const inv of row.overdue) {
      console.log(
        `      · ${inv.number} · échéance ${inv.dueDate?.toISOString().slice(0, 10) ?? "—"} · ${inv.status} · ${inv.total}`,
      );
    }
  }

  const logs = await prisma.paymentReminderLog.findMany({
    orderBy: { sentAt: "desc" },
    take: 5,
    include: { client: { select: { name: true } } },
  });
  console.log(`\nDernières relances (${logs.length} affichées) :`);
  if (logs.length === 0) {
    console.log("  (aucune)");
  } else {
    for (const log of logs) {
      console.log(
        `  - ${log.client.name} · jour ${log.reminderDay} · ${log.periodMonth} · ${log.sentAt.toISOString()}`,
      );
    }
  }
  console.log("");
}

async function runCron({ refDate, baseUrl }) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("CRON_SECRET manquant dans .env");
    process.exit(1);
  }

  const body = refDate ? { refDate } : {};
  const url = `${baseUrl.replace(/\/$/, "")}/api/cron/billing`;

  console.log(`POST ${url}`);
  if (refDate) console.log(`Date simulée : ${refDate}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("Réponse non JSON :", text);
    process.exit(1);
  }

  if (!res.ok) {
    console.error("Échec", res.status, json);
    process.exit(1);
  }

  console.log(JSON.stringify(json, null, 2));
}

const { cmd, refDate, baseUrl } = parseArgs(process.argv.slice(2));

try {
  if (cmd === "status") {
    await printStatus();
  } else if (cmd === "run") {
    await runCron({ refDate, baseUrl });
    await printStatus();
  } else {
    console.error("Commande inconnue. Utilisez : status | run");
    process.exit(1);
  }
} finally {
  await prisma.$disconnect();
}
