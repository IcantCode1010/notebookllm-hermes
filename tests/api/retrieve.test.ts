import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/retrieve/route";

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/retrieve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/retrieve", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RAGFLOW_BASE_URL;
    delete process.env.RAGFLOW_API_KEY;
    delete process.env.RAGFLOW_DATASET_STORE_B737NG;
  });

  it("applies topK per selected aircraft store", async () => {
    const response = await POST(
      jsonRequest({
        question: "Compare hydraulic architecture.",
        storeIds: ["store-a320", "store-b737ng"],
        topK: 1
      })
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.groups).toHaveLength(2);
    expect(body.groups[0].items).toHaveLength(1);
    expect(body.groups[1].items).toHaveLength(1);
  });

  it("retrieves from RAGFlow when a selected store has local dataset config", async () => {
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
                id: "chunk-b737",
                content: "System A powers the landing gear.",
                document_id: "ragflow-doc-b737",
                document_keyword: "B737 FCOM.pdf",
                positions: [[31]],
                similarity: 0.91
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
        storeIds: ["store-b737ng"],
        topK: 1
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
    expect(body.groups[0].items[0]).toMatchObject({
      id: "chunk-b737",
      storeId: "store-b737ng",
      documentId: "ragflow-doc-b737",
      documentTitle: "B737 FCOM.pdf",
      pageNumber: 31
    });
  });
});
