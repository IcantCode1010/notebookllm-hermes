# Architecture

Hermes Aviation Notebook uses a deliberately narrow set of service boundaries.

## Application

The Next.js app owns:

- user and role checks
- aircraft store selection
- document registry metadata
- chat sessions
- retrieval request scope
- citation mapping
- source viewer behavior

## RAGFlow

RAGFlow owns:

- document ingestion
- OCR
- PDF/image parsing
- chunking
- embeddings
- initial index creation
- source location metadata

The app should call RAGFlow only through server-side adapters.

For the next retrieval design, RAGFlow remains the ingestion pipeline. It should not be the only search runtime. Local RAGFlow is currently configured with Elasticsearch as its document engine, so the Hermes retrieval layer can query the RAGFlow-built Elasticsearch indexes directly while preserving RAGFlow for parsing, OCR, chunking, embedding, and source file handling.

## Hermes Elasticsearch Gateway

The Hermes Elasticsearch Gateway is the planned read-only tool boundary between Hermes and the local vector/index store.

The gateway owns:

- approved aircraft store to Elasticsearch index mapping
- query embedding generation for vector search
- keyword and hybrid search requests
- result fusion and score normalization
- neighboring chunk lookup
- document/page/chunk/source metadata normalization
- page rendering requests for visual inspection
- bounded vision analysis requests for candidate pages or regions
- tool activity summaries for the UI

The gateway must not expose raw Elasticsearch credentials, arbitrary Elasticsearch query execution, unrestricted dataset access, or document mutation tools.

Target gateway tools:

- `searchTextVectors`
- `searchKeywordText`
- `searchHybridEvidence`
- `getNeighboringChunks`
- `getPageEvidence`
- `renderSourcePage`
- `analyzeSourcePage`
- `openSourceTarget`

The gateway can be exposed to Hermes through MCP, HTTP tool endpoints, or both. During local development it may run inside the Next.js server boundary or as a separate local service beside RAGFlow. The complete Hermes agent on the VPS should call only the gateway/tool boundary, never raw Elasticsearch directly.

Implemented local transport:

- `GET /api/gateway/tools` returns the authenticated tool manifest
- `POST /api/gateway/tools` executes approved tool calls
- authentication uses `Authorization: Bearer <HERMES_GATEWAY_TOKEN>`
- current exposed tools are `searchHybridEvidence` and `openSourceTarget`

Implemented Hermes MCP transport:

- `scripts/hermes/notebookllm_mcp_server.py` exposes a stdio MCP adapter for the external Hermes VPS agent
- the adapter forwards to the same authenticated HTTP gateway and exposes only `searchHybridEvidence` and `openSourceTarget`
- Hermes registers these tools as `mcp_notebookllm_searchHybridEvidence` and `mcp_notebookllm_openSourceTarget`
- the VPS `hermes-api` service enables the dynamic `mcp-notebookllm` toolset

The HTTP bridge remains useful for direct health checks and non-MCP clients, but the preferred Hermes retrieval path is now MCP.

## Hermes

Hermes owns answer generation and read-only source research through app-controlled tools. It receives user questions, approved aircraft store scope, and normalized evidence returned by its tools.

Hermes can use:

- `searchHybridEvidence` for scoped direct Elasticsearch retrieval
- `getNeighboringChunks` for local context expansion
- `getPageEvidence` for citation and source target resolution
- `analyzeSourcePage` for bounded visual inspection of shortlisted pages
- `validateCitationTargets` for citation/source target validation

Hermes must not upload, parse, OCR, chunk, embed source documents, mutate indexes, run arbitrary database queries, or directly expose source documents. The app/gateway owns local credentials, dataset scope enforcement, citation normalization, and user-facing activity summaries.

## Frontend to VPS Agent

During local development, the frontend talks to the Next.js `/api/chat` route. That route decides whether to use the local Hermes runtime scaffold or the external Hermes VPS API server.

External Hermes routing is enabled only when these local server-side environment variables are present:

- `HERMES_API_BASE_URL`
- `HERMES_API_KEY`
- `HERMES_MODEL` optional
- `HERMES_GATEWAY_URL` optional

The browser never receives the Hermes API key. The Next.js server sends an OpenAI-compatible request to the Hermes VPS `/v1/chat/completions` endpoint, and the prompt instructs Hermes to retrieve aircraft evidence only through the configured NotebookLLM MCP tools. The VPS agent can reach the local gateway over Tailscale through its MCP adapter, while the local app reaches the VPS API over Tailscale.

The intended local development flow is:

```text
Browser UI -> Next.js /api/chat -> Hermes VPS API -> notebookllm MCP tools -> local gateway -> local Elasticsearch/RAGFlow index
```

If the Hermes VPS API variables are missing or the VPS API server is unavailable, `/api/chat` falls back to the local runtime scaffold so the UI can keep exercising document retrieval and citation navigation.

## MCP Gateway Direction

The complete Hermes agent currently runs outside this repo on a VPS. The planned integration path is a controlled MCP gateway rather than direct unrestricted RAGFlow access from the VPS agent.

Previous RAGFlow API tool boundary:

- `listSourceDocuments`
- `searchApprovedSources`
- `searchWithinDocument`
- `validateCitationTargets`
- `openSourceTarget`

Updated direction:

- keep RAGFlow for ingestion
- query Elasticsearch directly through gateway tools for faster retrieval
- support parallel keyword, vector, and visual evidence paths
- keep RAGFlow retrieval API available as a fallback/comparison path while the gateway is validated

The MCP gateway must enforce selected aircraft store scope, read-only operations, result limits, and normalized citation targets. RAGFlow, Elasticsearch, and embedding credentials remain server-side and are never sent to the browser or the VPS agent.
