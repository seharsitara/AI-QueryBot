/**
 * One-shot script to bootstrap the Qdrant collection used by the app.
 *
 * Run with:   yarn qdrant:setup
 *
 * Idempotent — safe to re-run. It will:
 *   1. Create the collection if it doesn't exist (single dense vector,
 *      1536 dims, cosine distance — matches text-embedding-3-small).
 *   2. Ensure payload indexes on `user_id` and `doc_id` exist (keyword
 *      type), so per-user and per-doc filters stay fast.
 *
 * Reads connection details from .env.local via Node's `--env-file` flag
 * (see the package.json script wrapper).
 */
import { QdrantClient } from "@qdrant/qdrant-js";
import { qdrantConfig } from "../src/lib/qdrant/config";

async function main() {
  const url = process.env.QDRANT_URL;
  if (!url) throw new Error("QDRANT_URL is not set");

  const client = new QdrantClient({
    url,
    apiKey: process.env.QDRANT_API_KEY,
  });

  const { collectionName, vectorSize, distance } = qdrantConfig;

  // 1. Create the collection if missing.
  const { collections } = await client.getCollections();
  const exists = collections.some((c) => c.name === collectionName);

  if (!exists) {
    console.log(`Creating collection "${collectionName}"…`);
    await client.createCollection(collectionName, {
      vectors: { size: vectorSize, distance },
      // RAG payloads can grow large — keep them off the hot path on disk.
      on_disk_payload: true,
    });
    console.log("✓ collection created");
  } else {
    console.log(`Collection "${collectionName}" already exists — skipping.`);
  }

  // 2. Ensure payload indexes — needed so filtered queries scale.
  //    `createPayloadIndex` is idempotent (no-op if already present).
  const indexFields: Array<{ name: string; type: "keyword" }> = [
    { name: "user_id", type: "keyword" },
    { name: "doc_id", type: "keyword" },
  ];

  for (const field of indexFields) {
    console.log(`Ensuring payload index on ${field.name}…`);
    await client.createPayloadIndex(collectionName, {
      field_name: field.name,
      field_schema: field.type,
      wait: true,
    });
  }

  console.log("\n✅ Qdrant setup complete.");
  console.log(`   URL:        ${url}`);
  console.log(`   Collection: ${collectionName}`);
  console.log(`   Vector:     ${vectorSize}d ${distance}`);
}

main().catch((err) => {
  console.error("❌ Qdrant setup failed:", err);
  process.exit(1);
});
