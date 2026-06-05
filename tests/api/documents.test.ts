import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/documents/route";

function documentsRequest(storeIds: string[]) {
  const url = new URL("http://localhost/api/documents");
  for (const storeId of storeIds) {
    url.searchParams.append("storeIds", storeId);
  }

  return new NextRequest(url);
}

describe("GET /api/documents", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RAGFLOW_BASE_URL;
    delete process.env.RAGFLOW_API_KEY;
    delete process.env.RAGFLOW_DATASET_STORE_B737NG;
  });

  it("lists configured RAGFlow dataset documents as source documents", async () => {
    process.env.RAGFLOW_BASE_URL = "http://ragflow.test";
    process.env.RAGFLOW_API_KEY = "test-key";
    process.env.RAGFLOW_DATASET_STORE_B737NG = "dataset-b737ng";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          code: 0,
          data: {
            docs: [
              {
                id: "ragflow-doc-b737",
                name: "05___029.PDF",
                chunk_num: 1183,
                size: 17307517
              }
            ],
            total: 1
          }
        })
      )
    );

    const response = await GET(documentsRequest(["store-b737ng"]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      new URL("/api/v1/datasets/dataset-b737ng/documents?page=1&page_size=1000", "http://ragflow.test"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-key" })
      })
    );
    expect(body.documents).toEqual([
      {
        id: "ragflow-doc-b737",
        storeId: "store-b737ng",
        title: "05___029.PDF",
        documentType: "PDF",
        status: "PUBLISHED",
        sourceUri: "/api/sources/ragflow-doc-b737",
        chunkCount: 1183,
        sizeBytes: 17307517
      }
    ]);
  });
});
