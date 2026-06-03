"use client";

import { Files, Plane } from "lucide-react";
import type { AircraftStore, SourceDocument } from "@/lib/types";

type StoreNavigatorProps = {
  stores: AircraftStore[];
  documents: SourceDocument[];
  selectedStoreIds: string[];
  onSelectedStoreIdsChange: (storeIds: string[]) => void;
};

export function StoreNavigator({
  stores,
  documents,
  selectedStoreIds,
  onSelectedStoreIdsChange
}: StoreNavigatorProps) {
  const comparisonEnabled = selectedStoreIds.length > 1;

  function selectSingleStore(storeId: string) {
    onSelectedStoreIdsChange([storeId]);
  }

  function toggleComparisonStore(storeId: string) {
    if (selectedStoreIds.includes(storeId)) {
      onSelectedStoreIdsChange(selectedStoreIds.filter((id) => id !== storeId));
      return;
    }

    onSelectedStoreIdsChange([...selectedStoreIds, storeId]);
  }

  return (
    <aside className="border-b border-cockpit-line bg-white lg:border-b-0 lg:border-r">
      <div className="border-b border-cockpit-line p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-cockpit-navy">
          <Plane className="h-4 w-4" />
          Aircraft stores
        </div>
      </div>

      <div className="space-y-2 p-3">
        {stores.map((store) => {
          const selected = selectedStoreIds.includes(store.id);
          return (
            <button
              key={store.id}
              type="button"
              onClick={() => selectSingleStore(store.id)}
              className={`w-full rounded-md border p-3 text-left text-sm transition ${
                selected ? "border-cockpit-blue bg-blue-50" : "border-cockpit-line bg-white hover:bg-slate-50"
              }`}
            >
              <span className="block font-semibold text-cockpit-navy">{store.name}</span>
              <span className="text-xs text-slate-600">{store.ragflowDatasetId}</span>
            </button>
          );
        })}
      </div>

      <div className="border-y border-cockpit-line p-3">
        <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Comparison</div>
        {stores.map((store) => (
          <label key={store.id} className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={selectedStoreIds.includes(store.id)}
              onChange={() => toggleComparisonStore(store.id)}
            />
            {store.aircraftCode}
          </label>
        ))}
        <p className="mt-2 text-xs text-slate-500">
          {comparisonEnabled ? "Hermes will receive grouped aircraft evidence." : "Single-store retrieval is active."}
        </p>
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cockpit-navy">
          <Files className="h-4 w-4" />
          Approved documents
        </div>
        <div className="space-y-2">
          {documents
            .filter((document) => selectedStoreIds.includes(document.storeId))
            .map((document) => (
              <div key={document.id} className="rounded-md border border-cockpit-line bg-cockpit-panel p-3">
                <div className="text-sm font-medium">{document.title}</div>
                <div className="mt-1 text-xs text-slate-600">{document.documentType}</div>
              </div>
            ))}
        </div>
      </div>
    </aside>
  );
}
