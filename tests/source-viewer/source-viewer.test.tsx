/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SourceViewer } from "@/components/source-viewer/SourceViewer";

vi.mock("@/components/source-viewer/PdfCanvasViewer", () => ({
  PdfCanvasViewer: ({ sourceUri, pageNumber }: { sourceUri: string; pageNumber?: number }) => (
    <div data-testid="mock-pdf-viewer">
      {sourceUri} page {pageNumber}
    </div>
  )
}));

describe("SourceViewer", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a PDF overview instead of loading missing placeholder PDFs before citation selection", () => {
    render(
      <SourceViewer
        documents={[
          {
            id: "doc-b737ng-fcom",
            storeId: "store-b737ng",
            title: "B737 NG FCOM - Hydraulics",
            documentType: "PDF",
            status: "PUBLISHED",
            sourceUri: "/sources/b737ng-fcom-hydraulics.pdf"
          }
        ]}
        activeCitation={null}
      />
    );

    expect(screen.getByText("Open document overview.")).toBeTruthy();
    expect(screen.queryByTestId("mock-pdf-viewer")).toBeNull();
  });

  it("opens RAGFlow citation documents through the app source proxy", () => {
    render(
      <SourceViewer
        documents={[]}
        activeCitation={{
          documentId: "ragflow-doc-b737",
          pageNumber: 42
        }}
      />
    );

    expect(screen.getByText("Retrieved PDF source")).toBeTruthy();
    expect(screen.getByTestId("mock-pdf-viewer").textContent).toContain("/api/sources/ragflow-doc-b737");
    expect(screen.getByTestId("mock-pdf-viewer").textContent).toContain("page 42");
  });
});
