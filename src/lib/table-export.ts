/**
 * Client-side table export utilities
 * Supports CSV, PDF, and HTML export formats
 */

// CSV Export with RFC 4180 compliance
export function exportToCSV(
  data: Array<Record<string, any>>,
  filename: string
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const escapeCSV = (value: any): string => {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Add BOM for Excel compatibility
  const BOM = "\uFEFF";
  const csvContent = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => escapeCSV(row[h])).join(","))
  ].join("\n");

  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}-${getDateStamp()}.csv`);
}

// PDF Export with professional template
export async function exportToPDF(
  data: Array<Record<string, any>>,
  title: string,
  filename: string
): Promise<void> {
  if (data.length === 0) return;

  // Dynamic import to reduce bundle size
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-900
  doc.text(title, 14, 22);
  
  // Add subtitle with export date and info
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  const exportDate = new Date().toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  doc.text(`Generated on: ${exportDate}`, 14, 30);
  doc.text(`Total Records: ${data.length}`, 14, 36);
  
  // Add a separator line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(14, 40, 196, 40);

  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => String(row[h] ?? "")));

  // @ts-ignore - jsPDF autoTable plugin
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 45,
    styles: { 
      fontSize: 9,
      cellPadding: 3,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: { 
      fillColor: [16, 185, 129], // emerald-500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: { 
      fillColor: [248, 250, 252] // slate-50
    },
    columnStyles: {
      // Right-align number columns
      ...headers.reduce((acc, header, index) => {
        if (header.toLowerCase().includes('mrr') || 
            header.toLowerCase().includes('revenue') ||
            header.toLowerCase().includes('total') ||
            header.toLowerCase().includes('share') ||
            header.toLowerCase().includes('subscribers')) {
          acc[index] = { halign: 'right' };
        }
        return acc;
      }, {} as Record<number, any>)
    },
    margin: { top: 45, right: 14, bottom: 20, left: 14 },
    didDrawPage: (data: any) => {
      // Add page footer
      const pageCount = doc.getNumberOfPages();
      const currentPage = doc.getCurrentPageInfo().pageNumber;
      
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      
      // Add "GrainHero Platform" footer
      doc.text(
        'GrainHero Platform - Business Analytics',
        14,
        doc.internal.pageSize.getHeight() - 10
      );
    }
  });

  doc.save(`${filename}-${getDateStamp()}.pdf`);
}

// HTML Export with inline styling
export function exportToHTML(
  data: Array<Record<string, any>>,
  title: string,
  filename: string
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const escapeHTML = (str: string): string => {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 40px;
      background: #f8f9fa;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 32px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1e293b;
      margin-bottom: 8px;
      font-size: 24px;
    }
    .meta {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th {
      background: #f1f5f9;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    tr:hover {
      background: #f1f5f9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHTML(title)}</h1>
    <p class="meta">Exported on ${new Date().toLocaleString()}</p>
    <table>
      <thead>
        <tr>
          ${headers.map((h) => `<th>${escapeHTML(h)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (row) =>
              `<tr>${headers.map((h) => `<td>${escapeHTML(String(row[h] ?? ""))}</td>`).join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  downloadBlob(blob, `${filename}-${getDateStamp()}.html`);
}

// Helper function to trigger download
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper to get date stamp for filenames
function getDateStamp(): string {
  return new Date().toISOString().split("T")[0];
}
