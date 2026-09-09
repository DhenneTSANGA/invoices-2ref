/**
 * Vérification E2E de l'espace Bilan (sans alias @/).
 */
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";

dotenv.config();

const prisma = new PrismaClient();
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL / SUPABASE_SECRET_KEY manquants");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EXPORTABLE = {
  invoice: ["paid", "archived"],
  quotation: ["accepted", "archived"],
  letter: ["signed", "sent", "archived"],
};

function exportDateRange(months, ref = new Date()) {
  const dateTo = new Date(
    Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()),
  );
  const dateFrom = new Date(dateTo);
  dateFrom.setUTCMonth(dateFrom.getUTCMonth() - months);
  return { dateFrom, dateTo };
}

function exportWhere(documentType) {
  if (documentType) {
    return {
      type: documentType,
      status: { in: EXPORTABLE[documentType] },
    };
  }
  return {
    OR: Object.entries(EXPORTABLE).map(([type, statuses]) => ({
      type,
      status: { in: statuses },
    })),
  };
}

async function main() {
  const results = [];
  const fail = (msg) => {
    results.push({ ok: false, msg });
    console.error("✗", msg);
  };
  const pass = (msg) => {
    results.push({ ok: true, msg });
    console.log("✓", msg);
  };

  try {
    await prisma.$queryRaw`SELECT 1 FROM document_export_jobs LIMIT 1`;
    pass("Table document_export_jobs");
  } catch (e) {
    fail(`Table: ${e.message}`);
  }

  if (!prisma.documentExportJob) {
    fail("Model Prisma documentExportJob absent — relancer prisma generate");
    await prisma.$disconnect();
    process.exit(1);
  }
  pass("Model Prisma documentExportJob");

  const company = await prisma.company.findFirst({
    select: { cabinet: true },
  });
  if (!company) {
    fail("Aucune société en base");
    await prisma.$disconnect();
    process.exit(1);
  }
  const cabinet = company.cabinet;
  pass(`Cabinet: ${cabinet}`);

  const { dateFrom, dateTo } = exportDateRange(12);
  for (const type of ["invoice", "quotation", "letter"]) {
    const count = await prisma.document.count({
      where: {
        cabinet,
        issueDate: { gte: dateFrom, lte: dateTo },
        ...exportWhere(type),
      },
    });
    console.log(`  ${type}: ${count} document(s) exportable(s) sur 12 mois`);
  }

  const traces = await prisma.documentPdfTrace.count();
  pass(`${traces} trace(s) PDF`);

  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    fail(`List buckets: ${listErr.message}`);
  } else {
    const has = buckets.some((b) => b.name === "document-exports");
    if (has) pass("Bucket document-exports existe");
    else {
      const { error: createErr } = await supabase.storage.createBucket(
        "document-exports",
        { public: true, fileSizeLimit: 50 * 1024 * 1024 },
      );
      if (createErr) fail(`Bucket document-exports MANQUANT: ${createErr.message}`);
      else pass("Bucket document-exports créé");
    }
  }

  const staff = await prisma.staffMember.findFirst({ select: { id: true } });
  if (!staff) {
    fail("Aucun staff en base");
    await prisma.$disconnect();
    process.exit(1);
  }

  const documents = await prisma.document.findMany({
    where: {
      cabinet,
      issueDate: { gte: dateFrom, lte: dateTo },
      ...exportWhere("letter"),
    },
    take: 5,
    include: {
      client: { select: { name: true } },
      pdfTraces: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (documents.length === 0) {
    console.log("⚠ Aucun courriel exportable — test export complet ignoré");
  } else {
    const job = await prisma.documentExportJob.create({
      data: {
        cabinet,
        createdById: staff.id,
        format: "both",
        documentType: "letter",
        months: 12,
        dateFrom,
        dateTo,
      },
    });
    pass(`Job créé: ${job.id}`);

    const zip = new JSZip();
    let pdfCount = 0;
    let skipped = 0;
    for (const doc of documents) {
      const trace = doc.pdfTraces[0];
      if (!trace?.fileUrl) {
        skipped++;
        continue;
      }
      const res = await fetch(trace.fileUrl);
      if (!res.ok) {
        skipped++;
        continue;
      }
      zip.file(`${doc.number}.pdf`, Buffer.from(await res.arrayBuffer()));
      pdfCount++;
    }
    pass(`${pdfCount} PDF récupéré(s) (${skipped} absent(s))`);

    const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
    const zipPath = `${cabinet}/exports/${job.id}/bilan-test.zip`;
    const { error: upZipErr } = await supabase.storage
      .from("document-exports")
      .upload(zipPath, zipBuf, {
        contentType: "application/zip",
        upsert: true,
      });
    if (upZipErr) fail(`Upload ZIP: ${upZipErr.message}`);
    else pass(`Upload ZIP OK (${(zipBuf.length / 1024).toFixed(1)} Ko)`);

    const csvBuf = Buffer.from(
      `\uFEFF"Numéro";"Client"\r\n${documents.map((d) => `"${d.number}";"${d.client.name}"`).join("\r\n")}`,
      "utf-8",
    );
    const csvPath = `${cabinet}/exports/${job.id}/bilan-test.csv`;
    const { error: upCsvErr } = await supabase.storage
      .from("document-exports")
      .upload(csvPath, csvBuf, {
        contentType: "text/csv;charset=utf-8",
        upsert: true,
      });
    if (upCsvErr) fail(`Upload CSV: ${upCsvErr.message}`);
    else pass(`Upload CSV OK (${csvBuf.length} octets)`);

    await prisma.documentExportJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        total: documents.length,
        progress: documents.length,
        skippedCount: skipped,
        zipPath,
        csvPath,
        zipUrl: `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/document-exports/${zipPath}`,
        csvUrl: `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/document-exports/${csvPath}`,
        completedAt: new Date(),
      },
    });
    pass("Job marqué completed en base");

    await supabase.storage.from("document-exports").remove([zipPath, csvPath]);
    await prisma.documentExportJob.delete({ where: { id: job.id } });
    pass("Nettoyage test OK");
  }

  await prisma.$disconnect();

  const failed = results.filter((r) => !r.ok);
  console.log("\n---");
  if (failed.length === 0) {
    console.log("Résultat: infrastructure Bilan OK");
  } else {
    console.log(`Résultat: ${failed.length} problème(s)`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
