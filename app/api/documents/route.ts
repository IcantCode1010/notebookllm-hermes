import { NextRequest, NextResponse } from "next/server";
import { aircraftStores, sourceDocuments } from "@/lib/mock-data";
import { hasLocalRagflowConfig, listDocumentsFromRagflow } from "@/lib/ragflow/adapter";

export async function GET(request: NextRequest) {
  const storeIds = selectedStoreIds(request);
  const stores = storeIds.length > 0 ? aircraftStores.filter((store) => storeIds.includes(store.id)) : aircraftStores;
  const documents = (
    await Promise.all(
      stores.map(async (store) => {
        if (hasLocalRagflowConfig(store)) {
          try {
            return await listDocumentsFromRagflow(store);
          } catch {
            return mockDocumentsForStore(store.id);
          }
        }

        return mockDocumentsForStore(store.id);
      })
    )
  ).flat();

  return NextResponse.json({ documents });
}

function selectedStoreIds(request: NextRequest) {
  const storeIds = request.nextUrl.searchParams.getAll("storeIds");
  const legacyStoreId = request.nextUrl.searchParams.get("storeId");
  return storeIds.length > 0 ? storeIds : legacyStoreId ? [legacyStoreId] : [];
}

function mockDocumentsForStore(storeId: string) {
  return sourceDocuments.filter((document) => document.status === "PUBLISHED" && document.storeId === storeId);
}
