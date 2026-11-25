/**
 * Rattrapage des factures d’abonnement envoyées sans PDF (novembre 2026…).
 *
 *   node scripts/backfill-subscription-pdfs.mjs --month 2026-11
 *   node scripts/backfill-subscription-pdfs.mjs --month 2026-11 --test-email moi@exemple.com
 *   node scripts/backfill-subscription-pdfs.mjs --month 2026-11 --send
 *
 * Par défaut : dry-run (aucun e-mail envoyé). Le secret CRON_SECRET est lu dans .env.
 */
import "dotenv/config";

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : (args[i + 1] ?? fallback);
};
const has = (name) => args.includes(name);

const baseUrl = flag("--url", "https://www.2r-hub.com").replace(/\/+$/, "");
const month = flag("--month", new Date().toISOString().slice(0, 7));
const testEmail = flag("--test-email", null);
const limit = Number(flag("--limit", "100"));
const send = has("--send");
const includeAll = has("--all");

const secret = process.env.CRON_SECRET?.trim();
if (!secret) {
  console.error("CRON_SECRET manquant dans .env");
  process.exit(1);
}

const endpoint = `${baseUrl}/api/cron/subscription-pdf-backfill`;

async function post(body) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json;
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  console.log(`\n=== Rattrapage ${month} — ${baseUrl} ===`);
  const list = await post({
    action: "list",
    month,
    limit,
    onlyMissingPdf: !includeAll,
  });
  console.log(
    `\n${list.total} facture(s) sans PDF joint (${list.candidates.length} affichée(s)) :`,
  );
  for (const c of list.candidates) {
    console.log(
      `  ${c.number} | ${c.status} | ${c.issueDate} | ${c.client} | ` +
        `${c.originalRecipients.join(", ") || "AUCUN MAIL"} | ` +
        `${c.hasEmailPdfTrace ? "PDF déjà joint" : "sans PDF"}`,
    );
  }

  if (list.total === 0) {
    console.log("\nRien à rattraper.");
    process.exit(0);
  }

  const first = list.candidates[0];
  console.log(`\n--- Rendu PDF de contrôle : ${first.number} ---`);
  const rendered = await post({
    action: "render",
    documentId: first.id,
    appUrl: baseUrl,
  });
  console.log(
    `  ${rendered.fileName} | ${rendered.pdfBytes} octets PDF | ` +
      `${rendered.previewBytes} octets aperçu`,
  );
  if (rendered.pdfBytes < 10_000) {
    throw new Error("PDF trop petit : rendu probablement invalide");
  }

  if (testEmail) {
    console.log(`\n--- Envoi de test à ${testEmail} ---`);
    const test = await post({
      action: "test",
      documentId: first.id,
      testEmail,
      appUrl: baseUrl,
    });
    console.log(`  envoyé (emailId=${test.emailId ?? "n/a"})`);
  }

  if (!send) {
    console.log("\nDRY RUN : aucun e-mail client envoyé. Relancez avec --send pour expédier.");
    process.exit(0);
  }

  console.log(`\n--- Renvoi avec PDF joint (${list.candidates.length} factures) ---`);
  let ok = 0;
  let failed = 0;
  for (const candidate of list.candidates) {
    try {
      const result = await post({
        action: "send",
        documentId: candidate.id,
        appUrl: baseUrl,
      });
      ok++;
      console.log(
        `  OK   ${result.number} → ${result.to} ` +
          `(${result.pdfBytes} octets)${result.failed?.length ? ` PARTIEL: ${JSON.stringify(result.failed)}` : ""}`,
      );
    } catch (err) {
      failed++;
      console.error(`  FAIL ${candidate.number} : ${err.message}`);
    }
    await pause(400);
  }
  console.log(`\nTerminé : ${ok} envoyée(s), ${failed} échec(s).`);
} catch (err) {
  console.error("ERREUR :", err.message);
  process.exit(1);
}
