/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoreNavigator } from "@/components/stores/StoreNavigator";
import { aircraftStores } from "@/lib/mock-data";
import type { SourceDocument } from "@/lib/types";

describe("StoreNavigator", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens selected vector-store documents from the document library", async () => {
    const user = userEvent.setup();
    const onOpenDocument = vi.fn();
    const documents: SourceDocument[] = [
      {
        id: "ragflow-doc-b737",
        storeId: "store-b737ng",
        title: "05___029.PDF",
        documentType: "PDF",
        status: "PUBLISHED",
        sourceUri: "/api/sources/ragflow-doc-b737",
        chunkCount: 1183
      }
    ];

    render(
      <StoreNavigator
        stores={aircraftStores}
        documents={documents}
        selectedStoreIds={["store-b737ng"]}
        onSelectedStoreIdsChange={vi.fn()}
        onOpenDocument={onOpenDocument}
        activeDocumentId={null}
      />
    );

    await user.click(screen.getByRole("button", { name: "05___029.PDF PDF 1,183 chunks" }));

    expect(onOpenDocument).toHaveBeenCalledWith(documents[0]);
  });
});
