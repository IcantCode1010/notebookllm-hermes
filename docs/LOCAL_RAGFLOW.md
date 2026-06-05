# Local RAGFlow

This app expects RAGFlow to run as a separate local Docker stack. RAGFlow owns document ingestion, OCR, parsing, chunking, embeddings, index creation, and source metadata. This repository owns the Next.js workspace, app metadata, RBAC, chat flow, retrieval gateway, and citation mapping.

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

## Map Datasets To Aircraft Stores

Aircraft stores have committed placeholder dataset IDs so the repo stays portable. For a local RAGFlow dataset, add an ignored `.env.local` override using the store ID:

```env
RAGFLOW_DATASET_STORE_A320="your-ragflow-dataset-id"
RAGFLOW_DATASET_STORE_B737NG="your-ragflow-dataset-id"
```

The app checks these local overrides before falling back to committed store metadata.

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

## Hermes Elasticsearch Gateway

The local RAGFlow stack currently uses Elasticsearch as its document engine. The app can let Hermes bypass the RAGFlow retrieval API and query the RAGFlow-built Elasticsearch index through a bounded server-side gateway.

Add these values to `.env.local` to enable the gateway for the B737NG store:

```env
HERMES_ELASTICSEARCH_BASE_URL="http://localhost:1200"
HERMES_ELASTICSEARCH_USERNAME="elastic"
HERMES_ELASTICSEARCH_PASSWORD="your-local-elasticsearch-password"
HERMES_ELASTICSEARCH_INDEX_STORE_B737NG="ragflow-your-index-id"
```

The index name can be found with:

```powershell
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
```

Then query Elasticsearch indexes locally with the Docker-provided Elasticsearch credentials. Do not commit credentials or expose this port to the browser.

Current gateway behavior:

- uses read-only Elasticsearch `_search`
- excludes vector fields from returned source payloads
- normalizes RAGFlow Elasticsearch fields into app `EvidenceItem` records
- preserves document ID, document title, page number, bounding box, and image ID when present
- falls back to the RAGFlow retrieval adapter when gateway settings are missing

Semantic vector KNN search is intentionally behind the next design step. The current index has a 1536-dimension vector field, but the gateway must confirm the matching embedding model before generating query vectors.
