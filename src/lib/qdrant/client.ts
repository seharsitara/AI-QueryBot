import { QdrantClient } from "@qdrant/qdrant-js";

// Lazy singleton — the client is cheap, but reusing one instance
// keeps the connection pool warm across server requests in dev.
let _client: QdrantClient | null = null;

// Returns a Qdrant client wired to QDRANT_URL / QDRANT_API_KEY.
// Throws early with a clear message if env vars are missing.
export function getQdrantClient(): QdrantClient {
  if (_client) return _client;

  const url = process.env.QDRANT_URL;
  if (!url) {
    throw new Error("QDRANT_URL is not set");
  }

  _client = new QdrantClient({
    url,
    apiKey: process.env.QDRANT_API_KEY,
  });

  return _client;
}
