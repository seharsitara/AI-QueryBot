// ------------------------------------------------------------
// .docx → plain text.
//
// We use `mammoth` (the de-facto Node lib for .docx) and its
// extractRawText API, which walks the document body and returns
// the textual content with paragraph breaks — exactly what the
// fixed-size chunker wants. We deliberately do NOT use mammoth's
// HTML conversion here: the embedding/chunking pipeline only
// needs clean text, and the visual fidelity job belongs to the
// preview pane (docx-preview), not the retrieval path.
//
// Imported lazily inside the function so the cron route
// cold-starts without pulling mammoth (and its jszip/xml deps)
// into its module graph until a .docx is actually processed.
// ------------------------------------------------------------

// Parses a .docx buffer and returns its text content as one
// string. Throws on corrupt / non-docx input.
export async function parseDocx(buffer: Uint8Array): Promise<string> {
  const mammoth = (await import("mammoth")).default;

  // mammoth's Node entry expects a Node Buffer.
  const { value } = await mammoth.extractRawText({
    buffer: Buffer.from(buffer),
  });

  return value;
}
