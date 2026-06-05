# Hermes Gateway Connection

This guide prepares the local NotebookLLM Hermes app so an external Hermes agent on a VPS can use the local Hermes Elasticsearch Gateway.

## Current Gateway Endpoint

The local app exposes a token-protected HTTP tool bridge:

```text
GET  /api/gateway/tools
POST /api/gateway/tools
```

`GET` returns the tool manifest. `POST` executes one approved tool call.

Current tools:

- `searchHybridEvidence`
- `openSourceTarget`

The gateway is read-only. It does not expose raw Elasticsearch query execution.

## Local Environment

Add these values to `.env.local`:

```env
HERMES_GATEWAY_TOKEN="generate-a-long-random-token"
HERMES_ELASTICSEARCH_BASE_URL="http://localhost:1200"
HERMES_ELASTICSEARCH_USERNAME="elastic"
HERMES_ELASTICSEARCH_PASSWORD="your-local-elasticsearch-password"
HERMES_ELASTICSEARCH_INDEX_STORE_B737NG="ragflow-your-b737ng-index"
```

Keep these values local. Do not commit secrets.

Start the local app:

```powershell
npm run dev
```

The local gateway is then available at:

```text
http://localhost:3000/api/gateway/tools
```

## Discovery Request

```bash
curl -H "Authorization: Bearer <HERMES_GATEWAY_TOKEN>" \
  http://localhost:3000/api/gateway/tools
```

Expected response includes:

```json
{
  "name": "hermes-aviation-gateway",
  "tools": [
    { "name": "searchHybridEvidence" },
    { "name": "openSourceTarget" }
  ]
}
```

## Search Tool Request

```bash
curl -X POST http://localhost:3000/api/gateway/tools \
  -H "Authorization: Bearer <HERMES_GATEWAY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "searchHybridEvidence",
    "arguments": {
      "query": "hydraulic system A landing gear",
      "storeIds": ["store-b737ng"],
      "topK": 5
    }
  }'
```

Response shape:

```json
{
  "tool": "searchHybridEvidence",
  "result": {
    "items": [
      {
        "id": "chunk-id",
        "storeId": "store-b737ng",
        "aircraftCode": "B737NG",
        "documentId": "document-id",
        "documentTitle": "05___029.PDF",
        "content": "Evidence text",
        "score": 4.2,
        "pageNumber": 42,
        "imageId": "optional-image-id"
      }
    ]
  }
}
```

## Source Target Tool Request

```bash
curl -X POST http://localhost:3000/api/gateway/tools \
  -H "Authorization: Bearer <HERMES_GATEWAY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "openSourceTarget",
    "arguments": {
      "documentId": "document-id",
      "pageNumber": 42
    }
  }'
```

## VPS Connectivity

Do not expose local Elasticsearch directly to the internet.

Expose only the local app gateway with one of these:

- Tailscale
- WireGuard
- Cloudflare Tunnel with access controls
- SSH reverse tunnel

The VPS Hermes agent should receive only:

```text
Gateway URL: https://your-secure-tunnel.example.com/api/gateway/tools
Gateway token: <HERMES_GATEWAY_TOKEN>
```

For the current Tailscale development setup, the local gateway URL is:

```text
http://100.99.248.116:3000/api/gateway/tools
```

The external Hermes agent should store the gateway bearer token in its own environment, not inside natural-language instructions.

## First-Class Hermes MCP Tooling

The preferred Hermes integration is now MCP, not prompt-driven curl commands.

The repo includes a stdio MCP adapter:

```text
scripts/hermes/notebookllm_mcp_server.py
```

On the VPS, the adapter is installed at:

```text
/opt/data/scripts/notebookllm_mcp_server.py
```

The adapter exposes only these read-only MCP tools:

- `searchHybridEvidence`
- `openSourceTarget`

Hermes registers them with the dynamic MCP naming convention:

- `mcp_notebookllm_searchHybridEvidence`
- `mcp_notebookllm_openSourceTarget`

The VPS Hermes `config.yaml` should include:

```yaml
toolsets:
  - hermes-cli
  - mcp-notebookllm

mcp_servers:
  notebookllm:
    command: python3
    args:
      - /opt/data/scripts/notebookllm_mcp_server.py
    env:
      HERMES_GATEWAY_TOKEN: ${HERMES_GATEWAY_TOKEN}
      HERMES_NOTEBOOKLLM_GATEWAY_URL: http://100.99.248.116:3000/api/gateway/tools
    timeout: 90
    connect_timeout: 20
    supports_parallel_tool_calls: true
    tools:
      include:
        - searchHybridEvidence
        - openSourceTarget
      resources: false
      prompts: false
```

After editing the config, restart the Hermes API service:

```bash
cd /docker/hermes-agent-vjel
docker compose restart hermes-api
```

To verify the MCP server is being used, inspect the MCP stderr log:

```bash
docker exec hermes-agent-vjel-hermes-api-1 tail -80 /opt/data/logs/mcp-stderr.log
```

Expected entries include `starting MCP server 'notebookllm'`, `ListToolsRequest`, and `CallToolRequest`.

## Frontend to Hermes VPS API

The NotebookLLM frontend does not call the Hostinger browser terminal or Hermes web UI port. The Next.js server calls the Hermes API server using the OpenAI-compatible API contract.

Expected Hermes API server values:

```env
API_SERVER_ENABLED=true
API_SERVER_HOST=0.0.0.0
API_SERVER_PORT=8642
API_SERVER_KEY="generate-a-long-random-token"
```

In the current VPS setup, keep the Hostinger terminal and API server as separate Compose services:

- `hermes-agent`: Hostinger terminal/web UI on `100.80.117.48:32770 -> 4860`
- `hermes-api`: OpenAI-compatible Hermes API on `100.80.117.48:32771 -> 8642`

The API service should run the Hermes gateway mode with:

```yaml
entrypoint: ["/opt/hermes/.venv/bin/hermes"]
command: ["--gateway"]
```

The Docker/Tailscale port mapping should expose only the Tailscale address:

```yaml
ports:
  - "100.80.117.48:32771:8642"
```

After the VPS API server is reachable, add these values to this app's local `.env.local`:

```env
HERMES_API_BASE_URL="http://100.80.117.48:32771/v1"
HERMES_API_KEY="<API_SERVER_KEY from the VPS>"
HERMES_MODEL="hermes-agent"
HERMES_GATEWAY_URL="http://100.99.248.116:3000/api/gateway/tools"
HERMES_CHAT_RETRIEVAL_MODE="server_prefetch"
```

Restart the local Next.js dev server after editing `.env.local`.

A healthy frontend-to-VPS path should show `Contact Hermes VPS` in the chat activity trail. If the trail still shows `Search vector store`, the app is still using the local fallback because `HERMES_API_BASE_URL` or `HERMES_API_KEY` is missing.

`HERMES_CHAT_RETRIEVAL_MODE=server_prefetch` is the low-latency local development mode. It makes Next.js perform one bounded gateway search, sends the top three truncated evidence chunks to Hermes, and asks Hermes to synthesize from those chunks. Leave it unset when you want the full Hermes MCP-agent loop for deeper multi-step research.

## VPS API Checks

Run these on the VPS:

```bash
cd /docker/hermes-agent-vjel
docker compose ps
docker exec hermes-agent-vjel-hermes-agent-1 sh -lc 'env | grep "^API_SERVER_"'
docker exec hermes-agent-vjel-hermes-agent-1 sh -lc 'ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || true'
docker exec hermes-agent-vjel-hermes-agent-1 sh -lc 'curl -sS -i http://127.0.0.1:8642/v1/health || true'
```

From the local machine, the exposed Tailscale port should pass:

```powershell
Test-NetConnection 100.80.117.48 -Port 32771
```

Then test with the bearer token:

```powershell
$headers = @{ Authorization = "Bearer <API_SERVER_KEY>" }
Invoke-RestMethod -Headers $headers http://100.80.117.48:32771/v1/health
```

Resolved on 2026-06-05: the Tailscale host is reachable, `100.80.117.48:32771` returns `/v1/health`, and the local frontend can call `/api/chat` through the Hermes VPS agent. The root cause was that this Hostinger image uses the `--gateway` flag for API/gateway mode; a prior `hermes gateway` style command was treated as a normal agent query and did not start the listener.

The local Next.js dev server must bind to all interfaces for the VPS to reach the local NotebookLLM gateway:

```powershell
npm run dev -- --hostname 0.0.0.0 --port 3000
```

If the dev server is bound only to `127.0.0.1`, the local browser may work but the VPS Hermes container will not be able to call `http://100.99.248.116:3000/api/gateway/tools`.

## Plain-English Hermes Agent Instructions

Give the VPS Hermes agent these instructions:

```text
Use the configured NotebookLLM MCP tools for all aircraft document retrieval.

Use mcp_notebookllm_searchHybridEvidence as your primary aircraft document retrieval tool.
Use mcp_notebookllm_openSourceTarget when the UI should open a cited source document or page.

Do not connect directly to Elasticsearch, RAGFlow, MySQL, MinIO, Docker, or any local infrastructure.
Do not ask for or reveal raw credentials.
Only search approved aircraft stores passed in the user/app context.
Keep result counts small. Use topK between 3 and 8 unless the user explicitly needs broader research.
Return answers grounded only in retrieved evidence.
Always preserve documentId and pageNumber in citations when available.
Summarize tool activity for the user without exposing raw Elasticsearch JSON, prompts, hidden reasoning, credentials, or internal logs.

For visual or diagram questions, first use searchHybridEvidence to shortlist candidate pages. Do not visually scan an entire manual.
```

## Current Limitation

The current gateway slice performs bounded lexical search over the RAGFlow Elasticsearch index. Vector KNN search is the next step and depends on confirming the exact 1536-dimension embedding model used during RAGFlow ingestion.
