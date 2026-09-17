/**
 * Vérifie que le contrat technique PDF / facture est intact après refonte visuelle.
 * Usage: node scripts/verify-invoice-preview-contract.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const checks = [];

function ok(name, pass, detail = "") {
  checks.push({ name, pass, detail });
}

const previewShell = read("src/components/documents/preview/PreviewShell.tsx");
const invoicePreview = read("src/components/documents/preview/InvoicePreview.tsx");
const downloadPdf = read("src/lib/pdf/downloadDocumentPdf.tsx");
const documentPreview = read("src/components/documents/DocumentPreview.tsx");
const exportPdf = read("src/lib/pdf/exportDocumentPdf.ts");

ok(
  "PreviewShell expose data-document-preview",
  previewShell.includes('data-document-preview'),
);
ok(
  "PreviewShell largeur PDF 820px",
  previewShell.includes("PREVIEW_WIDTH = 820") || previewShell.includes("820"),
);
ok(
  "InvoicePreview utilise forwardRef + PreviewShell",
  invoicePreview.includes("forwardRef") && invoicePreview.includes("PreviewShell"),
);
ok(
  "InvoicePreview — signature ManagerSignature intacte",
  invoicePreview.includes("ManagerSignature") &&
    invoicePreview.includes("omitStamp={omitSignature") &&
    invoicePreview.includes('doc.status === "signed"'),
);
ok(
  "DocumentPreview route facture → InvoicePreview",
  documentPreview.includes('case "invoice"') && documentPreview.includes("InvoicePreview"),
);
ok(
  "buildDocumentPdfFromDoc capture [data-document-preview]",
  downloadPdf.includes("[data-document-preview]") && downloadPdf.includes("compact"),
);
ok(
  "exportDocumentPdf PREVIEW_WIDTH 820",
  exportPdf.includes("PREVIEW_WIDTH = 820"),
);
const quotationPreview = read("src/components/documents/preview/QuotationPreview.tsx");

ok(
  "Facture — design papier réservé au cabinet conseil",
  invoicePreview.includes('doc.cabinet === "conseil"') &&
    invoicePreview.includes("isConseilDesign"),
);
ok(
  "Devis — design papier réservé au cabinet conseil",
  quotationPreview.includes('doc.cabinet === "conseil"') &&
    quotationPreview.includes("isConseilDesign"),
);
ok(
  "Devis — signature et pied de page conservés",
  quotationPreview.includes("ManagerSignature") &&
    quotationPreview.includes("LegalFooter") &&
    quotationPreview.includes('doc.status === "accepted"'),
);
ok(
  "Échelle typographique 11 / 13 centralisée",
  previewShell.includes('small: "text-[11px]"') &&
    previewShell.includes('base: "text-[13px]"') &&
    invoicePreview.includes("DOC_TEXT") &&
    quotationPreview.includes("DOC_TEXT"),
);
ok(
  "Export PDF — garde-fou une page sans déformation",
  exportPdf.includes("fitScale") && exportPdf.includes("A4_MIN_HEIGHT / naturalHeight"),
);
ok(
  "TotalsBlock — logique taxes inchangée",
  invoicePreview.includes("computeDocumentTotals") && invoicePreview.includes("documentTaxRates"),
);
ok(
  "Envoi e-mail — buildDocumentPdfFromDoc côté client",
  read("src/hooks/use-data.ts").includes("buildDocumentPdfFromDoc(input, { omitSignature: false })"),
);

const failed = checks.filter((c) => !c.pass);
console.log("\n=== Contrat aperçu facture / PDF ===\n");
for (const c of checks) {
  console.log(`${c.pass ? "OK" : "KO"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
}
console.log(`\n--- Résumé ---\nOK : ${checks.length - failed.length}\nKO : ${failed.length}\n`);
process.exit(failed.length ? 1 : 0);
