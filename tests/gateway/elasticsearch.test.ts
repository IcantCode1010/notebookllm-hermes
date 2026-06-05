import { describe, expect, it, vi } from "vitest";
import {
  hasElasticsearchGatewayConfig,
  normalizeElasticsearchEvidence,
  searchHybridEvidence
} from "@/lib/gateway/elasticsearch";
import type { AircraftStore } from "@/lib/types";

const store: AircraftStore = {
  id: "store-b737ng",
  name: "Boeing 737 NG",
  aircraftCode: "B737NG",
  ragflowDatasetId: "ragflow-b737ng-demo",
  status: "ACTIVE"
};

describe("normalizeElasticsearchEvidence", () => {
  it("maps RAGFlow Elasticsearch hits into Hermes evidence items", () => {
    const evidence = normalizeElasticsearchEvidence(store, {
      hits: {
        hits: [
          {
            _id: "e9776c43ffe57a03",
            _score: 7.2,
            _source: {
              content_with_weight: "Do a visual inspection of the bond straps shown in Figure 601.",
              doc_id: "8dc08ab25fc211f1bfd699100fdeac86",
              docnm_kwd: "05___029.PDF",
              img_id: "8156d2545fc211f1bfd699100fdeac86-e9776c43ffe57a03",
              page_num_int: [727, 728],
              position_int: [
                [727, 224, 456, 506, 530],
                [728, 204, 408, 41, 67]
              ]
            }
          }
        ]
      }
    });

    expect(evidence).toEqual([
      {
        id: "e9776c43ffe57a03",
        storeId: "store-b737ng",
        aircraftCode: "B737NG",
        documentId: "8dc08ab25fc211f1bfd699100fdeac86",
        documentTitle: "05___029.PDF",
        content: "Do a visual inspection of the bond straps shown in Figure 601.",
        score: 7.2,
        pageNumber: 727,
        boundingBox: { x: 224, y: 506, width: 232, height: 24 },
        imageId: "8156d2545fc211f1bfd699100fdeac86-e9776c43ffe57a03"
      }
    ]);
  });
});

describe("hasElasticsearchGatewayConfig", () => {
  it("requires base URL, store index, and credentials", () => {
    expect(
      hasElasticsearchGatewayConfig(store, {
        HERMES_ELASTICSEARCH_BASE_URL: "http://localhost:1200",
        HERMES_ELASTICSEARCH_USERNAME: "elastic",
        HERMES_ELASTICSEARCH_PASSWORD: "secret",
        HERMES_ELASTICSEARCH_INDEX_STORE_B737NG: "ragflow_store_index"
      })
    ).toBe(true);
  });
});

describe("searchHybridEvidence", () => {
  it("queries the configured store index with a bounded read-only keyword search", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({
        hits: {
          hits: [
            {
              _id: "chunk-1",
              _score: 4.5,
              _source: {
                content_with_weight: "Hydraulic system A powers the landing gear.",
                doc_id: "doc-b737",
                docnm_kwd: "B737 AMM.pdf",
                page_num_int: [42]
              }
            }
          ]
        }
      })
    );

    const evidence = await searchHybridEvidence(store, "hydraulic system A", 3, fetchMock as typeof fetch, {
      HERMES_ELASTICSEARCH_BASE_URL: "http://localhost:1200",
      HERMES_ELASTICSEARCH_USERNAME: "elastic",
      HERMES_ELASTICSEARCH_PASSWORD: "secret",
      HERMES_ELASTICSEARCH_INDEX_STORE_B737NG: "ragflow_store_index"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/ragflow_store_index/_search", "http://localhost:1200"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
          "Content-Type": "application/json"
        }),
        body: expect.stringContaining("hydraulic system A")
      })
    );
    const requestInit = fetchMock.mock.calls[0][1];
    if (!requestInit) {
      throw new Error("Expected Elasticsearch search request init.");
    }
    const searchBody = JSON.parse(requestInit.body as string);
    expect(searchBody.size).toBe(3);
    expect(JSON.stringify(searchBody.query)).not.toContain("content_with_weight");
    expect(evidence[0]).toMatchObject({
      id: "chunk-1",
      documentId: "doc-b737",
      documentTitle: "B737 AMM.pdf",
      pageNumber: 42
    });
  });
});
