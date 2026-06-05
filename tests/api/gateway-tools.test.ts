import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/gateway/tools/route";

function request(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

describe("/api/gateway/tools", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.HERMES_GATEWAY_TOKEN;
    delete process.env.HERMES_ELASTICSEARCH_BASE_URL;
    delete process.env.HERMES_ELASTICSEARCH_USERNAME;
    delete process.env.HERMES_ELASTICSEARCH_PASSWORD;
    delete process.env.HERMES_ELASTICSEARCH_INDEX_STORE_B737NG;
  });

  it("rejects unauthenticated discovery requests when a gateway token is configured", async () => {
    process.env.HERMES_GATEWAY_TOKEN = "gateway-secret";

    const response = await GET(request("http://localhost/api/gateway/tools"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized gateway request");
  });

  it("returns a tool manifest for authenticated Hermes agents", async () => {
    process.env.HERMES_GATEWAY_TOKEN = "gateway-secret";

    const response = await GET(
      request("http://localhost/api/gateway/tools", {
        headers: { Authorization: "Bearer gateway-secret" }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe("hermes-aviation-gateway");
    expect(body.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "searchHybridEvidence",
      "openSourceTarget"
    ]);
  });

  it("executes searchHybridEvidence through the configured Elasticsearch gateway", async () => {
    process.env.HERMES_GATEWAY_TOKEN = "gateway-secret";
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
      )
    );

    const response = await POST(
      request("http://localhost/api/gateway/tools", {
        method: "POST",
        headers: {
          Authorization: "Bearer gateway-secret",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tool: "searchHybridEvidence",
          arguments: {
            query: "hydraulic system A",
            storeIds: ["store-b737ng"],
            topK: 3
          }
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      new URL("/ragflow_b737_index/_search", "http://elasticsearch.test"),
      expect.objectContaining({ method: "POST" })
    );
    expect(body.tool).toBe("searchHybridEvidence");
    expect(body.result.items).toEqual([
      expect.objectContaining({
        id: "chunk-1",
        documentId: "doc-b737",
        documentTitle: "B737 AMM.pdf",
        pageNumber: 42
      })
    ]);
  });

  it("returns UI-safe source targets without touching Elasticsearch", async () => {
    process.env.HERMES_GATEWAY_TOKEN = "gateway-secret";

    const response = await POST(
      request("http://localhost/api/gateway/tools", {
        method: "POST",
        headers: {
          Authorization: "Bearer gateway-secret",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tool: "openSourceTarget",
          arguments: {
            documentId: "doc-b737",
            pageNumber: 42,
            imageId: "img-b737-page-42"
          }
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.target).toEqual({
      documentId: "doc-b737",
      pageNumber: 42,
      imageId: "img-b737-page-42"
    });
  });
});
