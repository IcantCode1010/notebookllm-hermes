/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";

vi.mock("@/components/source-viewer/SourceViewer", () => ({
  SourceViewer: ({ activeDocument }: { activeDocument?: { title: string } | null }) => (
    <div data-testid="mock-source-viewer">{activeDocument?.title ?? "No active document"}</div>
  )
}));

describe("WorkspaceShell", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uses a fixed-height workspace layout with a wider source viewer column", () => {
    render(<WorkspaceShell />);

    const workspace = screen.getByTestId("workspace-grid");
    expect(workspace.className).toContain("lg:h-[calc(100vh-4rem)]");
    expect(workspace.className).toContain("lg:overflow-hidden");
    expect(workspace.className).toContain("lg:grid-cols-[220px_minmax(640px,1fr)_300px]");
    expect(workspace.className).toContain("xl:grid-cols-[260px_minmax(760px,1fr)_320px]");
  });

  it("loads vector-store documents and opens a document selected from the library", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          documents: [
            {
              id: "ragflow-doc-b737",
              storeId: "store-b737ng",
              title: "05___029.PDF",
              documentType: "PDF",
              status: "PUBLISHED",
              sourceUri: "/api/sources/ragflow-doc-b737"
            }
          ]
        })
      )
    );

    render(<WorkspaceShell />);

    const documentButton = await screen.findByRole("button", { name: "05___029.PDF PDF" });
    await documentButton.click();

    expect(fetch).toHaveBeenCalledWith("/api/documents?storeIds=store-b737ng");
    expect(screen.getByTestId("mock-source-viewer").textContent).toBe("05___029.PDF");
  });
});
