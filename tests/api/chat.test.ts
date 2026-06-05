import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/chat/route";

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/chat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RAGFLOW_BASE_URL;
    delete process.env.RAGFLOW_API_KEY;
    delete process.env.RAGFLOW_DATASET_STORE_B737NG;
    delete process.env.HERMES_API_BASE_URL;
    delete process.env.HERMES_API_KEY;
    delete process.env.HERMES_MODEL;
    delete process.env.HERMES_GATEWAY_URL;
    delete process.env.HERMES_CHAT_RETRIEVAL_MODE;
    delete process.env.HERMES_ELASTICSEARCH_BASE_URL;
    delete process.env.HERMES_ELASTICSEARCH_USERNAME;
    delete process.env.HERMES_ELASTICSEARCH_PASSWORD;
    delete process.env.HERMES_ELASTICSEARCH_INDEX_STORE_B737NG;
  });

  it("rejects unknown aircraft stores", async () => {
    const response = await POST(
      jsonRequest({
        question: "What powers the yellow hydraulic system?",
        storeIds: ["not-a-store"]
      })
    );

    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Unknown aircraft store");
  });

  it("grounds chat responses in local RAGFlow retrieval when configured", async () => {
    process.env.RAGFLOW_BASE_URL = "http://ragflow.test";
    process.env.RAGFLOW_API_KEY = "test-key";
    process.env.RAGFLOW_DATASET_STORE_B737NG = "dataset-b737ng";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          code: 0,
          data: {
            chunks: [
              {
                id: "chunk-b737-hyd-a",
                content: "Hydraulic system A powers the landing gear.",
                document_id: "ragflow-doc-b737",
                positions: [[42]],
                similarity: 0.94
              }
            ],
            doc_aggs: [{ doc_id: "ragflow-doc-b737", doc_name: "B737 FCOM.pdf", count: 1 }],
            total: 1
          }
        })
      )
    );

    const response = await POST(
      jsonRequest({
        question: "What does hydraulic system A power?",
        storeIds: ["store-b737ng"]
      })
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      new URL("/api/v1/retrieval", "http://ragflow.test"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
        body: expect.stringContaining("dataset-b737ng")
      })
    );
    expect(body.answer).toContain("Hydraulic system A powers the landing gear.");
    expect(body.citations).toEqual([
      {
        id: "chunk-b737-hyd-a",
        label: "B737 FCOM.pdf, p. 42",
        target: {
          documentId: "ragflow-doc-b737",
          pageNumber: 42
        }
      }
    ]);
    expect(body.groups[0].items[0]).toMatchObject({
      id: "chunk-b737-hyd-a",
      documentTitle: "B737 FCOM.pdf"
    });
    expect(body.events.map((event: { label: string }) => event.label)).toEqual([
      "Search approved sources",
      "Rank evidence",
      "Generate answer",
      "Validate citations"
    ]);
    expect(body.toolCalls).toEqual([
      {
        name: "searchApprovedSources",
        status: "complete",
        summary: "Searched 1 approved aircraft store and returned 1 evidence item."
      },
      {
        name: "validateCitationTargets",
        status: "complete",
        summary: "Validated 1 citation target."
      }
    ]);
  });

  it("uses the Hermes VPS adapter when Hermes API settings are configured", async () => {
    process.env.HERMES_API_BASE_URL = "http://hermes.test/v1";
    process.env.HERMES_API_KEY = "api-key";
    process.env.HERMES_MODEL = "hermes-agent";
    process.env.HERMES_GATEWAY_URL = "http://100.99.248.116:3000/api/gateway/tools";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          choices: [
            {
              message: {
                role: "assistant",
                content:
                  'VPS Hermes answer.\n\nHERMES_NOTEBOOK_JSON_START\n{"answer":"VPS Hermes answer.","citations":[{"id":"chunk-vps","label":"05___029.PDF, p. 42","target":{"documentId":"doc-vps","pageNumber":42}}]}\nHERMES_NOTEBOOK_JSON_END'
              }
            }
          ]
        })
      )
    );

    const response = await POST(
      jsonRequest({
        question: "What does hydraulic system A power?",
        storeIds: ["store-b737ng"]
      })
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      new URL("/v1/chat/completions", "http://hermes.test"),
      expect.objectContaining({ method: "POST" })
    );
    expect(body.answer).toBe("VPS Hermes answer.");
    expect(body.citations).toEqual([
      {
        id: "chunk-vps",
        label: "05___029.PDF, p. 42",
        target: {
          documentId: "doc-vps",
          pageNumber: 42
        }
      }
    ]);
    expect(body.events.map((event: { label: string }) => event.label)).toContain("Contact Hermes VPS");
  });

  it("prefetches gateway evidence before Hermes synthesis in fast mode", async () => {
    process.env.HERMES_API_BASE_URL = "http://hermes.test/v1";
    process.env.HERMES_API_KEY = "api-key";
    process.env.HERMES_CHAT_RETRIEVAL_MODE = "server_prefetch";
    process.env.HERMES_ELASTICSEARCH_BASE_URL = "http://elastic.test";
    process.env.HERMES_ELASTICSEARCH_USERNAME = "elastic";
    process.env.HERMES_ELASTICSEARCH_PASSWORD = "password";
    process.env.HERMES_ELASTICSEARCH_INDEX_STORE_B737NG = "ragflow-b737-index";

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            hits: {
              hits: [
                {
                  _id: "chunk-prefetch",
                  _score: 10,
                  _source: {
                    doc_id: "doc-prefetch",
                    docnm_kwd: "05___029.PDF",
                    content_with_weight: "Volcanic ash inspection is required after flight through ash.",
                    page_num_int: 589
                  }
                }
              ]
            }
          })
        )
        .mockResolvedValueOnce(
          Response.json({
            choices: [
              {
                message: {
                  role: "assistant",
                  content:
                    'Fast VPS answer.\n\nHERMES_NOTEBOOK_JSON_START\n{"answer":"Fast VPS answer.","citations":[{"id":"chunk-prefetch","label":"05___029.PDF, p. 589","target":{"documentId":"doc-prefetch","pageNumber":589}}]}\nHERMES_NOTEBOOK_JSON_END'
                }
              }
            ]
          })
        )
    );

    const response = await POST(
      jsonRequest({
        question: "What triggers volcanic ash inspection?",
        storeIds: ["store-b737ng"]
      })
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      new URL("/ragflow-b737-index/_search", "http://elastic.test"),
      expect.objectContaining({ method: "POST" })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      new URL("/v1/chat/completions", "http://hermes.test"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("PREFETCHED_NOTEBOOK_EVIDENCE")
      })
    );
    expect(body.answer).toBe("Fast VPS answer.");
    expect(body.groups[0].items[0]).toMatchObject({
      id: "chunk-prefetch",
      documentTitle: "05___029.PDF"
    });
  });
});
