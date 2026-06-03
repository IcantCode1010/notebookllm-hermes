import { describe, expect, it } from "vitest";
import { groupEvidenceByStore } from "@/lib/retrieval/grouping";
import type { AircraftStore, EvidenceItem } from "@/lib/types";

const stores: AircraftStore[] = [
  {
    id: "store-a320",
    name: "Airbus A320",
    aircraftCode: "A320",
    ragflowDatasetId: "ragflow-a320-demo",
    status: "ACTIVE"
  },
  {
    id: "store-b737ng",
    name: "Boeing 737 NG",
    aircraftCode: "B737NG",
    ragflowDatasetId: "ragflow-b737ng-demo",
    status: "ACTIVE"
  }
];

const evidence: EvidenceItem[] = [
  {
    id: "ev-a320",
    storeId: "store-a320",
    aircraftCode: "A320",
    documentId: "doc-a320",
    documentTitle: "A320 FCOM",
    content: "A320 evidence",
    score: 0.9
  }
];

describe("groupEvidenceByStore", () => {
  it("preserves one group per requested store", () => {
    const groups = groupEvidenceByStore(stores, evidence);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ storeId: "store-a320", aircraftCode: "A320" });
    expect(groups[0].items).toHaveLength(1);
    expect(groups[1]).toMatchObject({ storeId: "store-b737ng", aircraftCode: "B737NG", items: [] });
  });

  it("rejects evidence outside the requested aircraft stores", () => {
    expect(() =>
      groupEvidenceByStore([stores[0]], [
        {
          ...evidence[0],
          id: "ev-wrong-store",
          storeId: "store-b737ng"
        }
      ])
    ).toThrow("not scoped");
  });
});
