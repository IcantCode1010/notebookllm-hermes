import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/sources/[documentId]/route";

function sourceRequest(documentId: string) {
  return new NextRequest(`http://localhost/api/sources/${documentId}`);
}

describe("GET /api/sources/[documentId]", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RAGFLOW_BASE_URL;
    delete process.env.RAGFLOW_API_KEY;
    delete process.env.RAGFLOW_DATASET_STORE_B737NG;
  });

  it("proxies configured RAGFlow PDF documents without exposing the RAGFlow API key", async () => {
    process.env.RAGFLOW_BASE_URL = "http://ragflow.test";
    process.env.RAGFLOW_API_KEY = "test-key";
    process.env.RAGFLOW_DATASET_STORE_B737NG = "dataset-b737ng";

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(pdfBytes, {
          status: 200,
          headers: { "Content-Type": "application/octet-stream" }
        })
      )
    );

    const response = await GET(sourceRequest("doc-b737"), {
      params: Promise.resolve({ documentId: "doc-b737" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(pdfBytes);
    expect(fetch).toHaveBeenCalledWith(
      new URL("/api/v1/datasets/dataset-b737ng/documents/doc-b737", "http://ragflow.test"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-key" })
      })
    );
  });
});
