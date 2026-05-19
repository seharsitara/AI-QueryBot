// ------------------------------------------------------------
// PDF → plain text.
//
// We use `unpdf` rather than calling `pdfjs-dist` directly.
// pdfjs-dist v5's `pdf.mjs` references browser globals (DOMMatrix,
// Path2D, ImageData…) at module-load time, which don't exist in
// Vercel's serverless Node runtime — that's the
// "ReferenceError: DOMMatrix is not defined" crash.
//
// unpdf wraps the SAME pdfjs engine but ships a serverless build
// with all those polyfills handled, so it runs cleanly in Node,
// edge, and worker runtimes with zero config.
//
// Still imported lazily inside the function so the cron route
// cold-starts without pulling the PDF engine into its module graph.
// ------------------------------------------------------------

// Parses a PDF buffer and returns its full text content as one
// string (all pages concatenated). Throws on corrupt / non-PDF input.
export async function parsePdf(buffer: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");

  // getDocumentProxy returns a pdfjs document proxy from raw bytes.
  const pdf = await getDocumentProxy(buffer);

  // mergePages: true → `text` is a single string with every page
  // joined, which is exactly what the fixed-size chunker wants.
  const { text } = await extractText(pdf, { mergePages: true });

  return text;
}
