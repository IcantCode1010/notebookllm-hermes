import { afterEach, describe, expect, it, vi } from "vitest";
import { runHermesAgent } from "@/lib/hermes/agent";
import { aircraftStores } from "@/lib/mock-data";

describe("runHermesAgent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RAGFLOW_BASE_URL;
    delete process.env.RAGFLOW_API_KEY;
    delete process.env.RAGFLOW_DATASET_STORE_B737NG;
    delete process.env.HERMES_ELASTICSEARCH_BASE_URL;
    delete process.env.HERMES_ELASTICSEARCH_USERNAME;
    delete process.env.HERMES_ELASTICSEARCH_PASSWORD;
    delete process.env.HERMES_ELASTICSEARCH_INDEX_STORE_B737NG;
  });

  it("prefers the Hermes Elasticsearch Gateway when it is configured", async () => {
    process.env.HERMES_ELASTICSEARCH_BASE_URL = "http://elasticsearch.test";
    process.env.HERMES_ELASTICSEARCH_USERNAME = "elastic";
    process.env.HERMES_ELASTICSEARCH_PASSWORD = "secret";
    process.env.HERMES_ELASTICSEARCH_INDEX_STORE_B737NG = "ragflow_b737_index";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          hits: {
            hits: [
              {
                _id: "chunk-b737-es",
                _score: 8.2,
                _source: {
                  content_with_weight: "Direct Elasticsearch evidence says hydraulic system A powers the landing gear.",
                  doc_id: "es-doc-b737",
                  docnm_kwd: "B737 AMM.pdf",
                  page_num_int: [43]
                }
              }
            ]
          }
        })
      )
    );

    const result = await runHermesAgent({
      question: "What does hydraulic system A power?",
      stores: aircraftStores.filter((store) => store.id === "store-b737ng")
    });

    expect(fetch).toHaveBeenCalledWith(
      new URL("/ragflow_b737_index/_search", "http://elasticsearch.test"),
      expect.objectContaining({ method: "POST" })
    );
    expect(result.answer).toContain("Direct Elasticsearch evidence");
    expect(result.toolCalls[0]).toEqual({
      name: "searchHybridEvidence",
      status: "complete",
      summary: "Searched 1 approved aircraft store through the Hermes Elasticsearch Gateway and returned 1 evidence item."
    });
  });

  it("uses read-only scoped RAGFlow tools to ground an answer", async () => {
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

    const result = await runHermesAgent({
      question: "What does hydraulic system A power?",
      stores: aircraftStores.filter((store) => store.id === "store-b737ng")
    });

    expect(fetch).toHaveBeenCalledWith(
      new URL("/api/v1/retrieval", "http://ragflow.test"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
        body: expect.stringContaining("dataset-b737ng")
      })
    );
    expect(result.answer).toContain("Hydraulic system A powers the landing gear.");
    expect(result.citations).toEqual([
      {
        id: "chunk-b737-hyd-a",
        label: "B737 FCOM.pdf, p. 42",
        target: {
          documentId: "ragflow-doc-b737",
          pageNumber: 42
        }
      }
    ]);
    expect(result.events.map((event) => event.label)).toEqual([
      "Search approved sources",
      "Rank evidence",
      "Generate answer",
      "Validate citations"
    ]);
    expect(result.toolCalls).toEqual([
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

  it("does not allow tool access outside the selected stores", async () => {
    await expect(
      runHermesAgent({
        question: "Search A320 too",
        stores: aircraftStores.filter((store) => store.id === "store-b737ng"),
        requestedStoreIds: ["store-a320"]
      })
    ).rejects.toThrow("Hermes tool request included an unapproved aircraft store");
  });
});
