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
  });
});
