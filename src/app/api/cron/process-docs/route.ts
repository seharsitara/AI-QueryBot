// ------------------------------------------------------------
// POST /api/cron/process-docs
//
// Queue worker. Triggered every 2 minutes by pg_cron via a
// Supabase Edge Function that forwards a POST here with a shared
// secret in the `x-cron-secret` header.
//
// Per tick:
//   1. Claim up to 5 pending rows (sets them to 'processing').
//   2. Run the parse → chunk → embed → upsert pipeline for each
//      in parallel.
//   3. Mark each row 'completed' (with chunk count + processed_at)
//      or 'failed' (with error message).
//
// Returns a summary so the dispatcher can log it.
// ------------------------------------------------------------

import { NextResponse } from "next/server";
import {
  claimPendingDocs,
  markDocCompleted,
  markDocFailed,
} from "@/repositories/docs";
import { processDoc } from "@/lib/rag/process-doc";

// Pipeline does network I/O (Storage download, embeddings, Qdrant) —
// it shouldn't run on the Edge runtime. Force Node so pdfjs-dist
// and the Supabase SDK behave consistently.
export const runtime = "nodejs";
// Don't cache responses — every invocation is a side-effect.
export const dynamic = "force-dynamic";
// A tick processes up to 5 docs (download + parse + embed + upsert).
// The 10s serverless default is not enough; raise it. (Vercel caps
// this at 60s on Hobby, higher on Pro.)
export const maxDuration = 60;

const BATCH_SIZE = 5;

export async function POST(req: Request) {
  // Shared-secret authentication.
  const headerSecret = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || headerSecret !== expected) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Wrap the whole tick so an unexpected throw (e.g. Supabase
  // unreachable) returns clean JSON the dispatcher can log, instead
  // of a platform-level FUNCTION_INVOCATION_FAILED.
  try {
    // 1. Claim the next batch atomically (status → 'processing').
    const claimed = await claimPendingDocs(BATCH_SIZE);
    if (claimed.length === 0) {
      return NextResponse.json({ claimed: 0, completed: 0, failed: 0 });
    }

    // 2. Run the pipeline for each claimed doc in parallel.
    //    Promise.allSettled keeps one failure from cancelling the rest.
    const results = await Promise.allSettled(
      claimed.map(async (doc) => {
        try {
          const { chunksCount } = await processDoc(doc);
          await markDocCompleted(doc.id, chunksCount);
          return { id: doc.id, ok: true as const };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[cron] processing ${doc.id} failed:`, err);
          await markDocFailed(doc.id, message);
          return { id: doc.id, ok: false as const, message };
        }
      }),
    );

    // 3. Roll up the counts. `allSettled` should never `rejected`
    //    since we catch inside, but handle it defensively.
    let completed = 0;
    let failed = 0;
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) completed++;
      else failed++;
    }

    return NextResponse.json({
      claimed: claimed.length,
      completed,
      failed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron] tick failed:", err);
    return NextResponse.json(
      { error: "Cron tick failed", detail: message },
      { status: 500 },
    );
  }
}
