# Hermes Aviation Notebook

Hermes Aviation Notebook is a controlled NotebookLM-style aviation document workspace. It lets approved users select aircraft-specific knowledge stores, ask questions, receive cited Hermes answers, and open the cited source in a central PDF/image viewer.

The core boundary is strict:

- RAGFlow retrieves.
- Hermes explains.
- The app controls identity, scope, permissions, chat state, citations, and UI.

## MVP Loop

```text
Select aircraft -> ask Hermes -> retrieve evidence -> answer with citations -> click citation -> view source
```

## Local Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run typecheck
npm run test
npm run build
npm run dev
```

Open <http://localhost:3000>.

## Environment

Required server-side settings:

```text
DATABASE_URL=
RAGFLOW_BASE_URL=
RAGFLOW_API_KEY=
HERMES_API_BASE_URL=
HERMES_API_KEY=
HERMES_MODEL=
```

Do not expose RAGFlow or Hermes API keys to browser code.

## Current State

This initial project contains a buildable Next.js scaffold with:

- three-pane workspace UI
- mock A320 and B737 NG stores
- mock source documents
- scoped retrieval API shape
- Hermes chat API shape
- citation-to-source navigation
- Prisma schema draft
- unit tests for retrieval grouping and citation resolution

Live RAGFlow and Hermes integrations are intentionally behind server-side adapter boundaries and are the next implementation step.
