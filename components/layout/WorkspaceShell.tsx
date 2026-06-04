"use client";

import { useMemo, useState } from "react";
import type { CitationTarget } from "@/lib/types";
import { aircraftStores, sourceDocuments } from "@/lib/mock-data";
import { HermesChat } from "@/components/hermes-chat/HermesChat";
import { SourceViewer } from "@/components/source-viewer/SourceViewer";
import { StoreNavigator } from "@/components/stores/StoreNavigator";

export function WorkspaceShell() {
  const defaultStoreId = aircraftStores.find((store) => store.id === "store-b737ng")?.id ?? aircraftStores[0].id;
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([defaultStoreId]);
  const [activeCitation, setActiveCitation] = useState<CitationTarget | null>(null);

  const selectedDocuments = useMemo(() => {
    return sourceDocuments.filter((document) => selectedStoreIds.includes(document.storeId));
  }, [selectedStoreIds]);

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-950">
      <header className="flex min-h-16 items-center justify-between border-b border-cockpit-line bg-white px-4">
        <div>
          <h1 className="text-lg font-semibold tracking-normal text-cockpit-navy">Hermes Aviation Notebook</h1>
          <p className="text-sm text-slate-600">Scoped aviation retrieval with cited Hermes answers</p>
        </div>
        <div className="rounded-md border border-cockpit-line px-3 py-2 text-xs font-semibold uppercase tracking-normal text-cockpit-blue">
          MVP workspace
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_390px]">
        <StoreNavigator
          stores={aircraftStores}
          documents={sourceDocuments}
          selectedStoreIds={selectedStoreIds}
          onSelectedStoreIdsChange={setSelectedStoreIds}
        />
        <SourceViewer documents={selectedDocuments} activeCitation={activeCitation} />
        <HermesChat selectedStoreIds={selectedStoreIds} onOpenSource={setActiveCitation} />
      </div>
    </main>
  );
}
