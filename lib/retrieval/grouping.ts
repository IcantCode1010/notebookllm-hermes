import type { AircraftStore, EvidenceItem, GroupedEvidence } from "@/lib/types";

export function groupEvidenceByStore(stores: AircraftStore[], evidence: EvidenceItem[]): GroupedEvidence[] {
  const requestedStoreIds = new Set(stores.map((store) => store.id));

  for (const item of evidence) {
    if (!requestedStoreIds.has(item.storeId)) {
      throw new Error(`Evidence item ${item.id} is not scoped to a requested aircraft store`);
    }
  }

  return stores.map((store) => ({
    storeId: store.id,
    aircraftCode: store.aircraftCode,
    items: evidence.filter((item) => item.storeId === store.id)
  }));
}
