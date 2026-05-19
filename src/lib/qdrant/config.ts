// Single source of truth for Qdrant collection settings.
// Anything that touches Qdrant — setup script, processing pipeline,
// chat retrieval — reads from here.

export const qdrantConfig = {
  // Collection name. Override via QDRANT_COLLECTION env var if needed.
  collectionName: process.env.QDRANT_COLLECTION ?? "rag-chatbot-docs",

  // Dense vector settings — must match the embedding model used in
  // src/lib/rag/embeddings.ts (OpenAI text-embedding-3-small).
  vectorSize: 1536,
  distance: "Cosine" as const,

  // Default number of chunks returned by semantic search.
  defaultTopK: 8,
};
