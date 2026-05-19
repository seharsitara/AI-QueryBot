/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep heavyweight Node-only deps out of the server bundle.
  // @qdrant/qdrant-js doesn't bundle cleanly; unpdf ships its own
  // serverless pdfjs build that must not be re-bundled by Next.
  serverExternalPackages: ["@qdrant/qdrant-js", "unpdf"],
  allowedDevOrigins: ['repeatedly-thorough-lemming.ngrok-free.app'],
  experimental: {
    // The /docs upload Server Action receives files as FormData.
    // Default Server Action body limit is 1 MB, but the app allows
    // up to MAX_FILES_PER_UPLOAD (5) × MAX_FILE_SIZE_BYTES (10 MB).
    // Keep this in sync with src/lib/docs/constants.ts.
    serverActions: {
      bodySizeLimit: "55mb",
    },
  },
};

module.exports = nextConfig;
