# Hermes Aviation Notebook PRD Tracking

Last updated: 2026-06-05

## Product Goal

Build a controlled, aviation-specific NotebookLM-style workspace where approved users can select aircraft knowledge stores, ask Hermes questions, receive cited answers, and open the cited PDF/image source in the center viewer.

## Critical MVP Loop

```text
Select aircraft -> ask Hermes -> retrieve evidence -> answer with citations -> click citation -> view source
```

## Current Baseline

Status: Local MVP integration in progress

Repository baseline includes:

- Next.js 15, React 19, TypeScript, Tailwind CSS
- Three-pane workspace shell
- Mock A320 and B737 NG aircraft stores
- RAGFlow-backed document library for configured local datasets, with mock fallback
- RAGFlow-backed retrieval and PDF source proxying for configured local datasets, with mock fallback
- Citation-to-source target resolution
- Server-side Hermes runtime scaffold with read-only RAGFlow tool access
- Full-document PDF source viewer with citation page jump and manual document open
- Local RAGFlow Elasticsearch document engine confirmed for the B737NG dataset, with chunk text, page metadata, image IDs, and dense vectors available in Elasticsearch
- Authenticated local HTTP gateway available for the external Hermes VPS agent through Tailscale
- First-class NotebookLLM MCP adapter configured on the Hermes VPS for read-only gateway tool access
- `/api/chat` can now switch between the local Hermes runtime scaffold and an OpenAI-compatible Hermes VPS API adapter when `HERMES_API_BASE_URL` and `HERMES_API_KEY` are configured
- Prisma schema draft
- Architecture and API contract docs
- Unit tests for retrieval grouping, citation resolution, RAGFlow normalization, source proxying, Hermes runtime, document library, and UI layout

## Release Criteria

- [ ] Users can select one aircraft store and ask Hermes a question.
- [ ] Retrieval preserves aircraft store scope on every evidence item.
- [ ] Multi-store comparison requires explicit multi-store selection.
- [ ] Hermes only receives retrieved evidence and never processes documents directly.
- [ ] Hermes retrieves through approved gateway tools, not unrestricted database access.
- [ ] Direct Elasticsearch retrieval preserves document ID, page number, chunk ID, and source target metadata.
- [ ] Vision search uses bounded page/image candidates and never scans full manuals blindly.
- [ ] Every visible citation maps to a source viewer action.
- [ ] Chat responses stream visible answer text while tool/retrieval activity is summarized, not shown as raw logs.
- [ ] End users cannot upload, register, edit, approve, or archive documents.
- [ ] Admin store and document registration routes enforce RBAC.
- [ ] Browser code never receives Hermes or RAGFlow API keys.
- [ ] Tests cover retrieval grouping, citation resolution, RBAC, and the critical MVP loop.

## Phase Tracker

| Phase | Status | Owner | Notes |
| --- | --- | --- | --- |
| 0. Project scaffold | Complete | Codex | Initial scaffold pushed to `main`. |
| 1. Domain model and seed data | In progress | TBD | Prisma schema exists; migrations and seed script still needed. |
| 2. Scoped retrieval contract | In progress | TBD | Mock fallback exists; `/api/retrieve` can call local RAGFlow for stores with dataset env overrides. Next design direction is a direct Elasticsearch retrieval adapter for Hermes gateway tools. |
| 3. Hermes server adapter | In progress | TBD | `/api/chat` now calls the external Hermes VPS through an OpenAI-compatible adapter when configured. Hermes uses the NotebookLLM MCP toolset for read-only retrieval, with local runtime fallback still available. |
| 4. Three-pane workspace UI | In progress | TBD | Shell exists; default test scope is B737NG; streaming chat timeline, summarized activity rows, production UI states, and mobile polish still needed. |
| 5. Source viewer and citation navigation | In progress | TBD | Citation clicks now open the full RAGFlow-backed PDF, jump to the cited page, and render nearby pages through PDF.js; image/OpenSeadragon rendering and bounding-box highlight overlays still needed. |
| 6. Admin workflow | Not started | TBD | Store/document registry UI and RBAC mutation tests needed. |
| 7. End-to-end MVP verification | Not started | TBD | Playwright critical-loop coverage needed. |

## Decision Log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-06-03 | Keep RAGFlow as the document/RAG engine. | Avoid building OCR, chunking, embeddings, and retrieval from scratch. |
| 2026-06-03 | Keep Hermes behind a server-side adapter. | Prevent secret exposure and preserve app control over retrieval scope. |
| 2026-06-03 | Start with a Next.js-only app boundary. | Faster MVP while preserving option to split a FastAPI adapter later. |
| 2026-06-03 | Use mock evidence in the scaffold. | Allows UI/API development before live RAGFlow and Hermes credentials are wired. |
| 2026-06-04 | Run RAGFlow locally as a separate Docker stack. | Keeps RAGFlow infrastructure outside app code while allowing local datasets and API integration. |
| 2026-06-04 | Show agent progress and tool activity as summarized streaming events, not verbatim tool output. | Gives users confidence that Hermes is searching and grounding answers without exposing raw RAGFlow JSON, prompts, secrets, logs, or hidden reasoning. |
| 2026-06-04 | Treat MCP as the preferred bridge for the external Hermes VPS agent. | Hermes can request read-only tools without receiving RAGFlow credentials or unrestricted dataset access. |
| 2026-06-04 | Shift retrieval design toward a Hermes Elasticsearch Gateway. | RAGFlow's retrieval API may become a bottleneck. RAGFlow should continue to ingest, OCR, chunk, and embed documents, while Hermes queries the RAGFlow-built Elasticsearch index through bounded read-only tools. |
| 2026-06-04 | Keep direct vector-store access behind a gateway, not inside the browser or unrestricted VPS agent. | Allows faster hybrid retrieval while preserving aircraft-store scope, result limits, citation normalization, source mapping, and local credential control. |
| 2026-06-05 | Integrate the frontend through the Hermes VPS API server contract, not the Hostinger browser terminal/web UI port. | Hermes documents expose OpenAI-compatible `/v1/chat/completions`, `/v1/responses`, `/v1/models`, and health endpoints on the API server port. The local app should call that server-to-server endpoint and keep tokens out of the browser. |
| 2026-06-05 | Use MCP as the preferred Hermes retrieval transport. | Hermes can discover and call `mcp_notebookllm_searchHybridEvidence` directly, avoiding terminal/curl approval loops while keeping the existing app-owned gateway as the enforcement boundary. |

## Open Questions

- [ ] Which authentication provider should gate admin and end-user roles?
- [ ] What is the exact Hermes VPS/MCP request-response and tool-callback contract?
- [ ] Should the Hermes Elasticsearch Gateway expose MCP directly, HTTP tools consumed by a Hermes adapter, or both?
- [ ] Where should the Hermes Elasticsearch Gateway run for development: inside this Next.js app, beside local RAGFlow, or as a separate local service reachable by the VPS Hermes agent through a secure tunnel?
- [ ] Which embedding provider/model should generate 1536-dimension query embeddings compatible with the current RAGFlow Elasticsearch `q_1536_vec` field?
- [ ] Should the first gateway release support only hybrid text retrieval, or include on-demand page rendering and vision analysis from the start?
- [ ] Where will source images be served from in MVP: local public assets, object storage, or RAGFlow URLs? Source PDFs now load through the app's local RAGFlow proxy.
- [ ] Should chat sessions be saved in the first MVP release or deferred?
- [ ] Should `/api/chat` streaming use SSE first, or a plain JSON endpoint until the Hermes adapter is connected?
- [ ] Why is the Hermes VPS API port mapping present but not reachable from the local Tailscale client?

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| RAGFlow response shape differs from the mock evidence contract. | Citation mapping may need rework. | Add adapter-level normalization tests before wiring UI to live data. |
| Hermes returns citations that do not map to evidence items. | Source viewer clicks may break. | Require citations to reference normalized evidence IDs. |
| Admin and end-user boundaries are implemented late. | End-user upload or mutation paths could leak into the MVP. | Add RBAC tests before building admin mutation UI. |
| PDF/image location metadata is incomplete. | Source viewer may only open document overview. | Make missing page/image metadata explicit in UI and logs. |
| VPS Hermes cannot reach local RAGFlow safely. | Real agent integration may stall or require insecure exposure of local services. | Use an MCP gateway or VPN/tunnel strategy that preserves app-owned scope enforcement and read-only tools. |
| Direct Elasticsearch retrieval bypasses RAGFlow reranking and response normalization. | Search quality or citation quality may regress if we reproduce only part of RAGFlow's retrieval behavior. | Start with a gateway adapter that normalizes RAGFlow index fields, adds hybrid search, preserves page/source metadata, and keeps RAGFlow retrieval available as a fallback comparison path. |
| Query embeddings do not match the indexed embedding model. | Vector search may return weak or irrelevant evidence. | Confirm the embedding model and vector dimensions before enabling semantic search; fall back to keyword/hybrid lexical search until compatibility is verified. |
| Elasticsearch index schema changes after RAGFlow upgrades. | Gateway search may break. | Keep schema detection and adapter tests around index field names such as `content_with_weight`, `doc_id`, `docnm_kwd`, `page_num_int`, `position_int`, `img_id`, and `q_1536_vec`. |
| Vision search is too expensive or slow if it analyzes many pages. | User-facing responses may stall. | Use RAG/Elasticsearch retrieval to shortlist pages first, cap visual inspections, cache page renders/captions, and summarize vision tool activity instead of exposing raw outputs. |
| Hermes VPS API server is not reachable from the local frontend. | The UI remains on the local runtime fallback and cannot test the complete external-agent loop. | Resolved on 2026-06-05 by running a dedicated `hermes-api` Compose service with Tailscale-only `32771:8642` publishing. Keep monitoring after VPS/container restarts. |

## Notes

Use this section for running product, implementation, and review notes.

### 2026-06-03

- Initial project scaffold created and pushed to GitHub.
- npm baseline pinned to `npm@11.16.0`.
- Remaining audit item: moderate PostCSS advisory through Next's nested dependency. npm's suggested fix currently forces a breaking downgrade, so it has not been applied.
- Review cleanup completed: `/api/retrieve` now applies `topK` per selected store, and `/api/chat` now rejects unknown store IDs with `404`.

### 2026-06-04

- Added local RAGFlow Docker helper scripts and setup docs.
- RAGFlow remains a separate service boundary; this repo connects to it through `RAGFLOW_BASE_URL` and `RAGFLOW_API_KEY`.
- Local RAGFlow stack is running in Docker from `.local/ragflow`, with the UI available at `http://localhost/` and API service at `http://localhost:9380`.
- `.env.local` is configured locally with RAGFlow connection settings; the API key was verified against `GET /api/v1/datasets` without committing secrets.
- First RAGFlow dataset/file ingestion has been started. Next validation step is a RAGFlow retrieval test using representative aviation questions before wiring the app adapter.
- Added server-side `lib/ragflow/` retrieval adapter and local dataset override support such as `RAGFLOW_DATASET_STORE_B737NG`.
- `/api/retrieve` now uses live RAGFlow evidence for configured stores and keeps mock evidence as the fallback for unconfigured stores.
- Verified the B737NG store against local RAGFlow through the app API; the request returned three chunks from `05___029.PDF`.
- `05___029.PDF` finished local RAGFlow processing with 1,183 indexed chunks.
- `/api/chat` now uses the same server-side RAGFlow retrieval path for configured stores, returns evidence-backed starter answers, and emits citations that target retrieved chunks.
- Confirmed the current app API, not the Hermes agent, is performing RAGFlow search. Hermes/LLM generation is not integrated yet.
- Inspected `nesquena/hermes-webui` for relevant patterns. Adopted the architecture direction of a server-side runtime/agent adapter boundary and a browser-facing event contract, but not its full CLI-parity WebUI scope.
- Product direction updated: end users should see a streaming Hermes timeline with concise progress and summarized tool activity, while final answer text streams normally and citations remain first-class controls.
- Tool activity should use product-facing labels such as "Search approved sources", "Rank evidence", "Generate answer", and "Validate citations"; implementation names, raw logs, prompts, API responses, and hidden reasoning stay server-side.
- Adjusted local browser testing defaults so the workspace opens on the configured B737NG RAGFlow dataset instead of the unconfigured A320 mock fallback.
- Added server-side PDF source proxying through `/api/sources/{documentId}` so the browser can load RAGFlow documents without seeing RAGFlow credentials.
- Added PDF.js canvas rendering in the source viewer. Browser verification opened a live `05___029.PDF` citation at page 664 of 1034 with no console errors.
- Upgraded PDF rendering from a single cited-page canvas to a full-document viewer that keeps the RAGFlow PDF loaded, jumps to the citation page, provides previous/next page controls, and virtualizes nearby page canvases so large manuals remain navigable.
- Adjusted the workspace layout so desktop panels scroll independently: long Hermes answers stay inside the chat response window, and the source viewer gets a wider center column for full-page PDF viewing.
- Updated the left document library to load documents from the selected RAGFlow vector store through `/api/documents`; users can now manually open a listed PDF in the source viewer outside of chat citations.
- Added the first Hermes agent runtime slice: `/api/chat` delegates to server-side read-only tools for scoped RAGFlow retrieval, evidence ranking, answer generation, citation validation, and user-facing activity summaries.
- Clarified deployment reality: the complete Hermes agent is running externally on a VPS, while this repo currently runs a local in-process Hermes runtime scaffold; RAGFlow and the frontend are local for development.
- Selected MCP as the likely bridge for the VPS Hermes agent. Target direction is a controlled MCP gateway exposing read-only tools such as `searchApprovedSources`, `listSourceDocuments`, `searchWithinDocument`, and `validateCitationTargets`, with this app retaining RAGFlow credentials, store scope enforcement, and citation normalization.
- Confirmed the local RAGFlow Docker stack uses Elasticsearch as the document engine. The B737NG dataset has a RAGFlow-managed Elasticsearch chunk index with text fields, page metadata, image IDs, and a `q_1536_vec` dense vector field.
- Updated retrieval direction: RAGFlow remains the ingestion, OCR, chunking, and embedding pipeline, but Hermes should search the RAGFlow-built Elasticsearch index through a controlled Hermes Elasticsearch Gateway instead of relying only on the RAGFlow retrieval API.
- Proposed gateway tools include `searchTextVectors`, `searchKeywordText`, `searchHybridEvidence`, `getNeighboringChunks`, `getPageEvidence`, `renderSourcePage`, `analyzeSourcePage`, and `openSourceTarget`.
- Vision search design: the gateway should first shortlist candidate chunks/pages through Elasticsearch, then render only bounded page/image candidates for Hermes vision analysis. Full-manual visual scanning is out of scope for MVP.
- Implemented the first Hermes Elasticsearch Gateway slice: a server-side adapter can query a configured RAGFlow Elasticsearch index with read-only search, exclude dense vector payloads, normalize hits into `EvidenceItem` records, and make Hermes prefer the gateway over RAGFlow retrieval when gateway env vars are present.
- The first gateway slice is keyword/lexical search over the Elasticsearch vector-store index. True KNN vector search remains gated on confirming the exact 1536-dimension embedding model used during RAGFlow ingestion.
- Added a local HTTP tool bridge for external Hermes agents at `/api/gateway/tools`. It supports authenticated tool discovery plus `searchHybridEvidence` and `openSourceTarget` execution using `HERMES_GATEWAY_TOKEN`.
- Added `docs/HERMES_GATEWAY_CONNECTION.md` with local setup, tunnel guidance, cURL checks, and plain-English instructions for configuring the Hermes VPS agent.

### 2026-06-05

- Wired the local chat API to support the external Hermes VPS agent through `lib/hermes/vps-adapter.ts`. When `HERMES_API_BASE_URL` and `HERMES_API_KEY` are present, `/api/chat` posts an OpenAI-compatible chat completion request to Hermes; otherwise it keeps the local runtime fallback.
- The VPS adapter instructs Hermes to use the local NotebookLLM gateway as its only aircraft-document retrieval interface and to return a bounded machine-readable citation block for the UI.
- Added targeted tests for the Hermes VPS adapter and `/api/chat` switching behavior.
- Verified the local gateway path is reachable over Tailscale and stays token-protected: unauthenticated gateway discovery returns `401`.
- Verified the UI still loads the B737NG RAGFlow document library and can ask questions through the current local gateway fallback. The visible activity trail currently shows `Search vector store`, confirming it is not yet using the VPS agent.
- Confirmed the current lexical-only gateway search can retrieve real cited pages but may return weak or irrelevant evidence for broad questions. KNN/hybrid retrieval and answer synthesis remain important before MVP quality review.
- Fixed the Hermes VPS API listener. The Hostinger image exposes API server mode through the `--gateway` flag, not a `gateway` subcommand in this deployment. Added a second Docker Compose service, `hermes-api`, so the existing Hostinger terminal service stays on `32770` while the OpenAI-compatible API server listens on `8642` and is published only to the VPS Tailscale IP at `32771`.
- Restarted the local Next.js dev server on `0.0.0.0:3000` so the VPS container can reach the local NotebookLLM gateway through the local Tailscale IP.
- Verified the Hermes API container can reach the local gateway over Tailscale and execute `searchHybridEvidence` with the gateway token.
- Updated local `.env.local` with server-side Hermes API settings. `/api/chat` now routes to the VPS Hermes agent and the activity trail returns `Contact Hermes VPS`, `Hermes searched gateway`, `Generate answer`, and `Validate citations`.
- Changed Hermes approvals from `manual` to `smart` on the VPS. This avoids full unsafe approval bypass while allowing low-risk gateway access to proceed during API-server requests.
- Added `scripts/hermes/notebookllm_mcp_server.py`, a stdio MCP adapter that exposes only `searchHybridEvidence` and `openSourceTarget` and forwards to the existing authenticated local gateway.
- Installed the MCP adapter on the VPS at `/opt/data/scripts/notebookllm_mcp_server.py`, added `mcp_servers.notebookllm` to Hermes config, and enabled the dynamic `mcp-notebookllm` toolset.
- Verified the MCP adapter with Hermes' Python MCP client: tool discovery returns `searchHybridEvidence` and `openSourceTarget`, and an MCP `CallToolRequest` returns real B737NG evidence from the local gateway.
- Verified a fresh frontend `/api/chat` request succeeds through the VPS path after the MCP configuration. The MCP stderr log shows fresh `ListToolsRequest` and `CallToolRequest` entries for `notebookllm`.
- Investigated chat latency. Direct gateway discovery/search is approximately 70-80 ms, and a trivial Hermes API chat completion is approximately 1.5 seconds. Ordinary aircraft Q&A latency was caused by Hermes agent/model orchestration and repeated retrieval/tool loops, not Elasticsearch, RAGFlow, or Tailscale.
- Added local fast mode with `HERMES_CHAT_RETRIEVAL_MODE=server_prefetch`. In this mode, Next.js performs one bounded gateway search locally, sends only the top three truncated evidence chunks to Hermes, and asks Hermes to synthesize from that prefetched evidence without calling MCP retrieval tools unless the evidence is unusable.
- Enabled fast mode in local `.env.local`. A warmed volcanic-ash chat request measured approximately 13.7 seconds after the change, down from roughly 22 seconds for the MCP-agent loop and much lower than the previous repeated-tool worst case.

### Add Future Notes Here

- Next architecture task: improve perceived latency with streaming/SSE so tool progress and answer tokens render while Hermes is still generating, then continue retrieval quality work with vector/KNN or stronger hybrid ranking.
