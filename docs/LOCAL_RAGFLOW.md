# Local RAGFlow

This app expects RAGFlow to run as a separate local Docker stack. RAGFlow owns document ingestion, OCR, parsing, chunking, embeddings, retrieval, and source metadata. This repository owns the Next.js workspace, app metadata, RBAC, chat flow, and citation mapping.

## Prerequisites

RAGFlow's official local Docker guidance expects:

- CPU: 4 or more cores
- RAM: 16 GB or more
- Disk: 50 GB or more
- Docker 24.0.0 or newer
- Docker Compose 2.26.1 or newer

On Windows with Docker Desktop and WSL2, Elasticsearch also needs `vm.max_map_count` set to at least `262144`.

## Setup

Clone the official RAGFlow repository into the ignored local workspace:

```powershell
npm run ragflow:setup
```

This creates:

```text
.local/ragflow
```

The checkout is pinned to `v0.25.6` by default, matching the current RAGFlow docs referenced during setup.

## Start RAGFlow

```powershell
npm run ragflow:start
```

If Elasticsearch fails to start on Windows because `vm.max_map_count` is too low, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/ragflow/start.ps1 -SetVmMaxMapCount
```

RAGFlow starts from its own `docker/` folder with its official Compose file.

Local endpoints:

```text
RAGFlow HTTP API: http://localhost:9380
RAGFlow web UI:   http://localhost
```

The RAGFlow UI can show a network anomaly while the backend is still initializing. Wait for the `docker-ragflow-cpu-1` logs to show the server running before using it.

## Get an API Key

In the RAGFlow UI:

1. Click your avatar in the top right.
2. Open the API page.
3. Copy or create an API key.
4. Put it in `.env.local`:

```env
RAGFLOW_BASE_URL="http://localhost:9380"
RAGFLOW_API_KEY="ragflow-your-key"
```

Do not expose the API key to client components.

## Stop RAGFlow

```powershell
npm run ragflow:stop
```

To remove local Docker volumes as well:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/ragflow/stop.ps1 -RemoveVolumes
```

Removing volumes deletes local RAGFlow service data.

## App Integration Rule

The Next.js app should call RAGFlow only through server-side code, eventually under:

```text
lib/ragflow/
app/api/retrieve/
```

Browser code must never call RAGFlow directly or receive `RAGFLOW_API_KEY`.

