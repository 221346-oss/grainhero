/**
 * Shared table export helpers — CSV and PDF, client-side. Every export button
 * across the app so far (ActivityLogsSection, traceability.tsx, reports.tsx)
 * hand-rolled its own `toCsv`/Blob+anchor pair; this factors that one pattern
 * out so new export buttons (e.g. the Grain Operations redesign) don't add
 * an Nth copy. PDF uses pdf-lib (already a project dependency, same library
 * claim-timeline-export.functions.ts and invoicing-pdf.server.ts use), run
 * in the browser instead of a server round-trip since there's nothing
 * sensitive to keep server-side for these tables.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** YYYY-MM-DD, appended to every downloaded filename so repeat exports don't overwrite each other. */
function dateStamp(): string {
  return new Date().toISOString().split("T")[0];
}

function stampedFilename(filename: string, ext: string): string {
  const base = filename.replace(new RegExp(`\\.${ext}$`, "i"), "");
  return `${base}-${dateStamp()}.${ext}`;
}

export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const header = columns.map((c) => csvCell(c.header)).join(",");
  const lines = rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(","));
  return [header, ...lines].join("\n");
}

export function downloadCsv<T>(filename: string, rows: T[], columns: ExportColumn<T>[]) {
  const csv = toCsv(rows, columns);
  // Leading BOM so Excel renders non-ASCII characters (currency symbols, accented names) correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = stampedFilename(filename, "csv");
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Simple tabular PDF — one page, wraps to a new page every ~45 rows. Good enough for the row counts these tables show (tens, not thousands). */
export async function downloadPdf<T>(filename: string, title: string, rows: T[], columns: ExportColumn<T>[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 792; // landscape letter
  const pageHeight = 612;
  const margin = 36;
  const colWidth = (pageWidth - margin * 2) / columns.length;
  const rowHeight = 16;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function drawHeader() {
    page.drawText(title, { x: margin, y, size: 12, font: bold, color: rgb(0.05, 0.4, 0.2) });
    y -= 20;
    columns.forEach((c, i) => {
      page.drawText(c.header, { x: margin + i * colWidth, y, size: 8, font: bold, color: rgb(0.2, 0.2, 0.2) });
    });
    y -= rowHeight;
  }
  drawHeader();

  for (const row of rows) {
    if (y < margin + rowHeight) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawHeader();
    }
    columns.forEach((c, i) => {
      const raw = c.value(row);
      const text = raw == null ? "" : String(raw);
      page.drawText(text.slice(0, 40), { x: margin + i * colWidth, y, size: 8, font, color: rgb(0.1, 0.1, 0.1) });
    });
    y -= rowHeight;
  }

  const bytes = await doc.save();
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = stampedFilename(filename, "pdf");
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
