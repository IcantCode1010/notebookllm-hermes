# API Contracts

## `POST /api/retrieve`

Request:

```json
{
  "question": "What powers the yellow hydraulic system?",
  "storeIds": ["store-a320"],
  "topK": 5
}
```

Response:

```json
{
  "groups": [
    {
      "storeId": "store-a320",
      "aircraftCode": "A320",
      "items": []
    }
  ]
}
```

## `POST /api/chat`

Request:

```json
{
  "question": "What powers the yellow hydraulic system?",
  "storeIds": ["store-a320"]
}
```

Response:

```json
{
  "answer": "Grounded answer text.",
  "citations": [
    {
      "id": "ev-a320-yellow-hyd",
      "label": "A320 FCOM - Hydraulics, p. 42",
      "target": {
        "documentId": "doc-a320-fcom",
        "pageNumber": 42
      }
    }
  ],
  "groups": [],
  "events": [
    {
      "label": "Search approved sources",
      "status": "complete"
    }
  ],
  "toolCalls": [
    {
      "name": "searchApprovedSources",
      "status": "complete",
      "summary": "Searched 1 approved aircraft store and returned 3 evidence items."
    }
  ]
}
```

## `GET /api/stores`

Returns active aircraft stores visible to the current user.

## `GET /api/documents?storeIds=store-a320`

Returns published documents for selected aircraft stores. Configured stores are listed from RAGFlow through the server adapter; unconfigured stores use mock fallback documents.

Response:

```json
{
  "documents": [
    {
      "id": "ragflow-doc-b737",
      "storeId": "store-b737ng",
      "title": "05___029.PDF",
      "documentType": "PDF",
      "status": "PUBLISHED",
      "sourceUri": "/api/sources/ragflow-doc-b737",
      "chunkCount": 1183,
      "sizeBytes": 17307517
    }
  ]
}
```

## Planned Hermes Elasticsearch Gateway Tools

These are internal tool contracts for the Hermes agent/runtime. They are not browser-facing APIs and must enforce aircraft-store scope server-side.

## `GET /api/gateway/tools`

Returns the local Hermes Gateway tool manifest for authenticated external agents.

Authentication:

```text
Authorization: Bearer <HERMES_GATEWAY_TOKEN>
```

Response:

```json
{
  "name": "hermes-aviation-gateway",
  "version": "0.1.0",
  "tools": [
    {
      "name": "searchHybridEvidence"
    },
    {
      "name": "openSourceTarget"
    }
  ]
}
```

## `POST /api/gateway/tools`

Executes one approved gateway tool call for authenticated external Hermes agents.

Request:

```json
{
  "tool": "searchHybridEvidence",
  "arguments": {
    "query": "hydraulic system A",
    "storeIds": ["store-b737ng"],
    "topK": 5
  }
}
```

Response:

```json
{
  "tool": "searchHybridEvidence",
  "result": {
    "items": []
  }
}
```

### `searchHybridEvidence`

Runs bounded keyword and vector search against approved Elasticsearch indexes, then returns normalized evidence.

Request:

```json
{
  "query": "fuel shutoff valve diagram labels",
  "storeIds": ["store-b737ng"],
  "topK": 8,
  "searchMode": "hybrid"
}
```

Response:

```json
{
  "items": [
    {
      "id": "es-chunk-e9776c43ffe57a03",
      "storeId": "store-b737ng",
      "aircraftCode": "B737NG",
      "documentId": "8dc08ab25fc211f1bfd699100fdeac86",
      "documentTitle": "05___029.PDF",
      "content": "Chunk text returned from Elasticsearch.",
      "score": 0.84,
      "pageNumber": 728,
      "imageId": "8156d2545fc211f1bfd699100fdeac86-e9776c43ffe57a03"
    }
  ]
}
```

### `getNeighboringChunks`

Fetches bounded context around a known chunk from the same approved store and document.

Request:

```json
{
  "storeId": "store-b737ng",
  "documentId": "8dc08ab25fc211f1bfd699100fdeac86",
  "chunkId": "e9776c43ffe57a03",
  "before": 1,
  "after": 1
}
```

### `renderSourcePage`

Renders a source document page or page region for visual inspection. The rendered image is returned as an internal asset reference, not raw document credentials.

Request:

```json
{
  "storeId": "store-b737ng",
  "documentId": "8dc08ab25fc211f1bfd699100fdeac86",
  "pageNumber": 728
}
```

### `analyzeSourcePage`

Runs bounded vision analysis on a previously shortlisted page or region. This tool should only be used after text/vector retrieval has selected candidate pages.

Request:

```json
{
  "storeId": "store-b737ng",
  "documentId": "8dc08ab25fc211f1bfd699100fdeac86",
  "pageNumber": 728,
  "question": "What labels are shown in the figure?"
}
```

### `openSourceTarget`

Returns a UI-safe source target that opens the full PDF at the cited page.

Request:

```json
{
  "documentId": "8dc08ab25fc211f1bfd699100fdeac86",
  "pageNumber": 728,
  "chunkId": "e9776c43ffe57a03"
}
```
