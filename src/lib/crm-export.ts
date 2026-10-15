/**
 * Exports / imports de l’espace Prospection (cahier des charges §5 et §8) :
 * Excel (.xlsx) et PDF côté navigateur, lecture Excel ou CSV à l’import.
 * Les bibliothèques sont chargées à la demande.
 */

export type SheetColumn = { header: string; key: string; width?: number };

export type SheetSpec = {
  name: string;
  columns: SheetColumn[];
  rows: Record<string, string | number | null | undefined>[];
};

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadXlsx(fileName: string, sheets: SheetSpec[]) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "2R Hub — Prospection";
  for (const spec of sheets) {
    const sheet = workbook.addWorksheet(spec.name.slice(0, 31));
    sheet.columns = spec.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? Math.max(12, c.header.length + 2),
    }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    for (const row of spec.rows) sheet.addRow(row);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName,
  );
}

/** Tableau simple en PDF (A4 paysage) : titre, sous-titre, en-têtes et lignes. */
export async function downloadTablePdf(
  fileName: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const colW = (pageW - margin * 2) / headers.length;
  let y = margin;

  doc.setFontSize(16);
  doc.text(title, margin, y + 4);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(subtitle, margin, y + 10);
  doc.setTextColor(0);
  y += 18;

  const drawHeader = () => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => doc.text(h, margin + i * colW, y));
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(200);
    doc.line(margin, y + 2, pageW - margin, y + 2);
    y += 7;
  };
  drawHeader();
  for (const row of rows) {
    if (y > pageH - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
    row.forEach((cell, i) => {
      const text = doc.splitTextToSize(String(cell), colW - 2)[0] ?? "";
      doc.text(text, margin + i * colW, y);
    });
    y += 6;
  }
  doc.save(fileName);
}

/** Découpe CSV robuste : séparateur « , » ou « ; », champs entre guillemets. */
function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ""));
}

/** Lit un fichier Excel (.xlsx) ou CSV en lignes de cellules texte (1re feuille). */
export async function readSpreadsheet(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    const rows: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = (row.values as unknown[]).slice(1).map((v) => {
        if (v == null) return "";
        if (typeof v === "object" && v !== null && "text" in v) return String((v as { text: unknown }).text);
        if (typeof v === "object" && v !== null && "result" in v) return String((v as { result: unknown }).result ?? "");
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        return String(v);
      });
      rows.push(values.map((c) => c.trim()));
    });
    return rows.filter((r) => r.some((c) => c !== ""));
  }
  return parseCsv(await file.text());
}

/** Même découpe pour un texte collé (CSV ou colonnes copiées depuis Excel). */
export function parsePastedTable(text: string): string[][] {
  if (text.includes("\t")) {
    return text
      .split(/\r?\n/)
      .map((l) => l.split("\t").map((c) => c.trim()))
      .filter((r) => r.some((c) => c !== ""));
  }
  return parseCsv(text);
}
