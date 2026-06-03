import { describe, expect, it } from "vitest";
import { resolveCitationTarget } from "@/lib/citations/resolve";
import type { EvidenceItem } from "@/lib/types";

const evidence: EvidenceItem = {
  id: "ev-a320",
  storeId: "store-a320",
  aircraftCode: "A320",
  documentId: "doc-a320-fcom",
  documentTitle: "A320 FCOM",
  content: "Hydraulic evidence",
  score: 0.91,
  pageNumber: 42,
  boundingBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }
};

describe("resolveCitationTarget", () => {
  it("returns PDF page and highlight metadata", () => {
    expect(resolveCitationTarget(evidence, "doc-a320-fcom")).toEqual({
      documentId: "doc-a320-fcom",
      pageNumber: 42,
      boundingBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      imageId: undefined
    });
  });

  it("rejects an unknown expected document", () => {
    expect(() => resolveCitationTarget(evidence, "doc-other")).toThrow("unknown document");
  });
});
