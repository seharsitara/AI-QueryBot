# RAG Chatbot

A document-grounded chat application. Upload your own `.pdf`, `.txt`, and `.md`
files; ask questions and get answers grounded in those documents via Retrieval
Augmented Generation.

> Status: Phase 1 of a planned rebuild. Scaffolding, cleanup, and package
> upgrades are complete. Feature work (auth, upload pipeline, chat threads,
> dashboard UI) lands in subsequent phases. See
> [`planning/rebuild-plan.md`](planning/rebuild-plan.md) for the full plan.

## Stack

| Layer              | Choice                                                  |
| ------------------ | ------------------------------------------------------- |
| Framework          | Next.js 16 (App Router) + React 19                      |
| Language           | TypeScript                                              |
| AI SDK             | Vercel AI SDK v6 (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) |
| LLM                | OpenAI `gpt-4o`                                         |
| Embeddings         | OpenAI `text-embedding-3-small` (1536 dims)             |
| Vector DB          | Qdrant (cloud or self-hosted)                           |
| Auth + DB + Storage| Supabase (Postgres + Auth + Storage + Edge Functions)   |
| Queue / cron       | `pg_cron` + `pg_net` → Supabase Edge Function → Next.js |
| PDF parsing        | `pdfjs-dist`                                            |
| UI                 | Tailwind CSS + shadcn/ui (strict monochrome theme)      |

## Architecture in one diagram

```
upload  ──▶  Supabase Storage  +  memory_docs (status=pending)
                                      │
                              pg_cron every 2 min
                                      ▼
                              Edge Function (dispatcher)
                                      │  POST + secret
                                      ▼
                              /api/cron/process-docs
                                      │  parse → chunk → embed → upsert
                                      ▼
                                    Qdrant
                                      ▲
                                      │ semantic search (filter: user_id)
chat  ──▶  /api/chat  ──▶  stream answer  ──▶  onFinish: save messages
```

## Getting started

```bash
# 1. Install deps
yarn install

# 2. Copy env template and fill in your secrets
cp .env.example .env.local

# 3. Run the dev server
yarn dev
```

Open <http://localhost:3000>.

## Environment variables

See [`.env.example`](.env.example). At minimum you'll need an OpenAI key,
a Qdrant instance, and a Supabase project.

## Scripts

| Command          | What it does                                  |
| ---------------- | --------------------------------------------- |
| `yarn dev`       | Start the Next.js dev server                  |
| `yarn build`     | Production build                              |
| `yarn start`     | Run the production build                      |
| `yarn lint`      | ESLint                                        |
| `yarn typecheck` | `tsc --noEmit` — fast type check, no output   |

## Project structure (target — populated across phases)

```
src/
├── app/
│   ├── (auth)/login, signup       # Phase 3
│   ├── (dashboard)/chat, docs     # Phase 5–6
│   └── api/                       # chat, threads, docs, cron
├── components/
│   ├── ui/                        # shadcn primitives
│   ├── chat/                      # message bubble, chunks panel
│   ├── docs/                      # upload zone, docs table
│   └── sidebar/
├── lib/
│   ├── supabase/                  # browser, server, middleware clients
│   ├── qdrant/                    # client + search helpers
│   └── rag/                       # pdf parser, chunker, embeddings, pipeline
├── repositories/                  # data-access layer (docs, threads, messages)
└── types/

supabase/
├── migrations/                    # schema + RLS + pg_cron
└── functions/process-docs/        # cron dispatcher
```

## License

MIT
