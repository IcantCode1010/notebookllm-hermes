import { describe, expect, it } from "vitest";
import { normalizeRagflowRetrieval, resolveStoreDatasetId } from "@/lib/ragflow/adapter";
import type { AircraftStore } from "@/lib/types";

const store: AircraftStore = {
  id: "store-b737ng",
  name: "Boeing 737 NG",
  aircraftCode: "B737NG",
  ragflowDatasetId: "ragflow-b737ng-demo",
  status: "ACTIVE"
};

describe("normalizeRagflowRetrieval", () => {
  it("maps RAGFlow chunks into Hermes evidence items", () => {
    const evidence = normalizeRagflowRetrieval(store, {
      code: 0,
      data: {
        chunks: [
          {
            id: "chunk-1",
            content: "Hydraulic system A powers primary flight controls.",
            document_id: "doc-ragflow-1",
            document_keyword: "B737 FCOM.pdf",
            image_id: "",
            positions: [[31, 120, 240, 300, 360]],
            similarity: 0.88
          }
        ],
        doc_aggs: [{ doc_id: "doc-ragflow-1", doc_name: "B737 FCOM.pdf", count: 1 }],
        total: 1
      }
    });

    expect(evidence).toEqual([
      {
        id: "chunk-1",
        storeId: "store-b737ng",
        aircraftCode: "B737NG",
        documentId: "doc-ragflow-1",
        documentTitle: "B737 FCOM.pdf",
        content: "Hydraulic system A powers primary flight controls.",
        score: 0.88,
        pageNumber: 31,
        boundingBox: { x: 120, y: 300, width: 120, height: 60 }
      }
    ]);
  });

  it("throws when RAGFlow returns a non-zero response code", () => {
    expect(() =>
      normalizeRagflowRetrieval(store, {
        code: 102,
        message: "Dataset not found",
        data: { chunks: [], doc_aggs: [], total: 0 }
      })
    ).toThrow("RAGFlow retrieval failed: Dataset not found");
  });
});

describe("resolveStoreDatasetId", () => {
  it("uses a local environment override before committed store metadata", () => {
    expect(
      resolveStoreDatasetId(store, {
        RAGFLOW_DATASET_STORE_B737NG: "local-dataset-id"
      })
    ).toBe("local-dataset-id");
  });

  it("falls back to the store dataset id when no override exists", () => {
    expect(resolveStoreDatasetId(store, {})).toBe("ragflow-b737ng-demo");
  });
});
