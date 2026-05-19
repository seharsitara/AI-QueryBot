// ------------------------------------------------------------
// Client-side PDF export for generated document summaries.
// ------------------------------------------------------------

import { jsPDF } from "jspdf";

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^[-*]\s+/gm, "• ")
    .trim();
}

export function downloadSummaryPdf(params: {
  fileName: string;
  summary: string;
}): void {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 6;

  const baseName = params.fileName.replace(/\.[^.]+$/, "") || "document";

  doc.setFontSize(16);
  doc.text(`Summary: ${baseName}`, margin, margin);

  doc.setFontSize(11);
  const body = stripMarkdown(params.summary);
  const lines = doc.splitTextToSize(body, maxWidth);

  let y = margin + 14;
  for (const line of lines) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }

  doc.save(`${baseName}-summary.pdf`);
}
