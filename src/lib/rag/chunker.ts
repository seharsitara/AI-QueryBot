// ------------------------------------------------------------
// Fixed-size character chunker (offset-aware).
//
// Strategy: walk the text in windows of `chunkSize` characters,
// stepping forward by (chunkSize - chunkOverlap) each time. Same
// algorithm for every supported file type (pdf, txt, md) since
// the input is already a flat string by the time it lands here.
//
// Each chunk carries `start`/`end` offsets into the CANONICAL
// text — i.e. `text.trim()`. The processing pipeline persists
// that exact canonical string as a Storage sidecar, so the
// preview pane can highlight a cited span precisely via these
// offsets. `.trim()` is idempotent, so callers that pass an
// already-trimmed string stay perfectly aligned.
//
// NOTE: individual chunks are intentionally NOT trimmed — doing
// so would shift offsets and break highlighting. Whitespace-only
// windows are skipped, but real windows keep their raw slice.
//
// Defaults match the project spec: 5000 / 300.
// ------------------------------------------------------------

export const DEFAULT_CHUNK_SIZE = 5000;
export const DEFAULT_CHUNK_OVERLAP = 300;

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface TextChunk {
  content: string; // exactly canonical.slice(start, end)
  start: number; // inclusive offset into the canonical text
  end: number; // exclusive offset into the canonical text
}

// Returns the canonical form of a parsed document: the single
// source of truth that chunk offsets reference and that the
// preview renders. Kept tiny + shared so the pipeline and chunker
// never drift.
export function toCanonicalText(text: string): string {
  return text.trim();
}

// Splits `text` into overlapping fixed-size chunks with offsets.
// Skips whitespace-only windows. Returns [] for empty input.
export function chunkText(
  text: string,
  options: ChunkOptions = {},
): TextChunk[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  if (overlap >= chunkSize) {
    throw new Error("chunkOverlap must be smaller than chunkSize");
  }

  const canonical = toCanonicalText(text);
  if (canonical.length === 0) return [];

  // Document fits in a single chunk — no need to slide.
  if (canonical.length <= chunkSize) {
    return [{ content: canonical, start: 0, end: canonical.length }];
  }

  const step = chunkSize - overlap;
  const chunks: TextChunk[] = [];

  for (let start = 0; start < canonical.length; start += step) {
    const end = Math.min(start + chunkSize, canonical.length);
    const content = canonical.slice(start, end);

    // Keep the raw window (offsets must stay exact); only skip
    // windows that are entirely whitespace.
    if (content.trim().length > 0) {
      chunks.push({ content, start, end });
    }

    // We've covered the tail — no point starting a further window.
    if (end >= canonical.length) break;
  }

  return chunks;
}
