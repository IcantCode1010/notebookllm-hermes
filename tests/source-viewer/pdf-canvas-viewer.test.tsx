/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { PdfCanvasViewer } from "@/components/source-viewer/PdfCanvasViewer";

const renderPage = vi.fn((): { promise: Promise<void>; cancel?: () => void } => ({ promise: Promise.resolve() }));
const cancelRender = vi.fn();
const getPage = vi.fn();
const destroyPdf = vi.fn();

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn()
}));

describe("PdfCanvasViewer", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as CanvasRenderingContext2D);
    getPage.mockResolvedValue({
      getViewport: vi.fn(() => ({ width: 612, height: 792 })),
      render: renderPage
    });
    vi.mocked(getDocument).mockReturnValue({
      promise: Promise.resolve({
        numPages: 120,
        getPage,
        destroy: destroyPdf
      })
    } as never);
  });

  it("loads the full PDF document once and jumps to the cited page", async () => {
    render(<PdfCanvasViewer sourceUri="/api/sources/doc-b737" pageNumber={42} />);

    await screen.findByText("Page 42 of 120");

    expect(getDocument).toHaveBeenCalledTimes(1);
    expect(getDocument).toHaveBeenCalledWith({ url: "/api/sources/doc-b737" });
    expect(screen.getByTestId("pdf-document-scroller").getAttribute("data-page-count")).toBe("120");
    expect(screen.getByTestId("pdf-document-scroller").className).toContain("h-[calc(100vh-15rem)]");
    expect(screen.getByTestId("pdf-page-slot-42")).toBeTruthy();
    await vi.waitFor(() => expect(screen.getByTestId("pdf-page-canvas-42").getAttribute("width")).toBe("612"));
    expect(screen.getByTestId("pdf-page-canvas-42").getAttribute("height")).toBe("792");
  });

  it("keeps the same document loaded while browsing to neighboring pages", async () => {
    const user = userEvent.setup();
    render(<PdfCanvasViewer sourceUri="/api/sources/doc-b737" pageNumber={42} />);

    await screen.findByText("Page 42 of 120");
    await user.click(screen.getByRole("button", { name: "Next page" }));

    await screen.findByText("Page 43 of 120");

    expect(getDocument).toHaveBeenCalledTimes(1);
    expect(getPage).toHaveBeenCalledWith(43);
  });

  it("cancels in-flight page rendering when a rendered page unmounts", async () => {
    renderPage.mockReturnValueOnce({ promise: new Promise(() => undefined), cancel: cancelRender });

    const { unmount } = render(<PdfCanvasViewer sourceUri="/api/sources/doc-b737" pageNumber={42} />);

    await screen.findByText("Page 42 of 120");
    await vi.waitFor(() => expect(renderPage).toHaveBeenCalled());
    unmount();

    expect(cancelRender).toHaveBeenCalledTimes(1);
  });

  it("releases the old PDF document when the source document changes", async () => {
    const { rerender } = render(<PdfCanvasViewer sourceUri="/api/sources/doc-b737-a" pageNumber={42} />);

    await screen.findByText("Page 42 of 120");

    rerender(<PdfCanvasViewer sourceUri="/api/sources/doc-b737-b" pageNumber={42} />);

    await vi.waitFor(() => expect(destroyPdf).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(getDocument).toHaveBeenCalledTimes(2));
  });
});
