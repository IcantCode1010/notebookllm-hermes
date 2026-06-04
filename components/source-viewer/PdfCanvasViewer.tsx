"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoundingBox } from "@/lib/types";

type PdfCanvasViewerProps = {
  sourceUri: string;
  pageNumber?: number;
  boundingBox?: BoundingBox;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy?: () => Promise<void> | void;
};

type PdfPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<unknown>; cancel?: () => void };
};

type PdfState =
  | { status: "loading" }
  | { status: "ready"; pdf: PdfDocument; pageCount: number }
  | { status: "error"; message: string };

const DEFAULT_PAGE_HEIGHT = 860;
const PAGE_RENDER_RADIUS = 2;
const PAGE_SCALE = 1.25;

export function PdfCanvasViewer({ sourceUri, pageNumber = 1, boundingBox }: PdfCanvasViewerProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pageStrideRef = useRef(DEFAULT_PAGE_HEIGHT);
  const [state, setState] = useState<PdfState>({ status: "loading" });
  const [currentPage, setCurrentPage] = useState(normalizePage(pageNumber, Number.MAX_SAFE_INTEGER));
  const [pageHeight, setPageHeight] = useState(DEFAULT_PAGE_HEIGHT);

  useEffect(() => {
    let cancelled = false;
    let loadedPdf: PdfDocument | null = null;

    async function loadPdf() {
      setState({ status: "loading" });

      try {
        const { GlobalWorkerOptions, getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
        if (!GlobalWorkerOptions.workerSrc) {
          GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
        }

        loadedPdf = (await getDocument({ url: sourceUri }).promise) as unknown as PdfDocument;

        if (!cancelled) {
          const targetPage = normalizePage(pageNumber, loadedPdf.numPages);
          setCurrentPage(targetPage);
          setState({ status: "ready", pdf: loadedPdf, pageCount: loadedPdf.numPages });
        }
      } catch (error) {
        if (!cancelled) {
          console.error("PDF document load failed", error instanceof Error ? error.message : String(error));
          setState({ status: "error", message: "Unable to load this PDF source." });
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      void loadedPdf?.destroy?.();
    };
  }, [sourceUri, pageNumber]);

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }

    const targetPage = normalizePage(pageNumber, state.pageCount);
    setCurrentPage(targetPage);
    scrollToPage(targetPage);
  }, [pageNumber, state]);

  const visiblePages = useMemo(() => {
    if (state.status !== "ready") {
      return [];
    }

    const pages: number[] = [];
    for (
      let page = Math.max(1, currentPage - PAGE_RENDER_RADIUS);
      page <= Math.min(state.pageCount, currentPage + PAGE_RENDER_RADIUS);
      page += 1
    ) {
      pages.push(page);
    }

    return pages;
  }, [currentPage, state]);

  function scrollToPage(targetPage: number) {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const top = (targetPage - 1) * pageStrideRef.current;
    if (typeof scroller.scrollTo === "function") {
      scroller.scrollTo({ top, behavior: "auto" });
    } else {
      scroller.scrollTop = top;
    }
  }

  function moveToPage(targetPage: number) {
    if (state.status !== "ready") {
      return;
    }

    const nextPage = normalizePage(targetPage, state.pageCount);
    setCurrentPage(nextPage);
    scrollToPage(nextPage);
  }

  function handleScroll() {
    if (state.status !== "ready") {
      return;
    }

    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const centeredPage = normalizePage(
      Math.floor((scroller.scrollTop + scroller.clientHeight / 2) / pageStrideRef.current) + 1,
      state.pageCount
    );
    setCurrentPage(centeredPage);
  }

  const handlePageMeasured = useCallback((height: number) => {
    const nextHeight = Math.ceil(height + 56);
    pageStrideRef.current = nextHeight;
    setPageHeight(nextHeight);
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <ViewerStatus>Loading PDF source...</ViewerStatus>
        <div className="h-[calc(100vh-15rem)] min-h-0 rounded-md border border-cockpit-line bg-slate-100" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <ViewerStatus tone="warning">{state.message}</ViewerStatus>
        <div className="h-[calc(100vh-15rem)] min-h-0 rounded-md border border-cockpit-line bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-3 border-b border-cockpit-line pb-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-cockpit-line bg-white text-cockpit-navy disabled:cursor-not-allowed disabled:opacity-40"
            disabled={currentPage <= 1}
            onClick={() => moveToPage(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            Page {currentPage} of {state.pageCount}
          </span>
          <button
            type="button"
            aria-label="Next page"
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-cockpit-line bg-white text-cockpit-navy disabled:cursor-not-allowed disabled:opacity-40"
            disabled={currentPage >= state.pageCount}
            onClick={() => moveToPage(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {pageNumber ? <span className="text-cockpit-blue">Citation page {normalizePage(pageNumber, state.pageCount)}</span> : null}
          {boundingBox ? <span className="text-cockpit-amber">Highlight metadata available</span> : null}
        </div>
      </div>
      <div
        ref={scrollerRef}
        data-testid="pdf-document-scroller"
        data-page-count={state.pageCount}
        className="h-[calc(100vh-15rem)] min-h-0 overflow-auto rounded-md border border-cockpit-line bg-slate-100 p-3"
        onScroll={handleScroll}
      >
        <div className="relative" style={{ height: state.pageCount * pageHeight }}>
          {visiblePages.map((page) => (
            <section
              key={page}
              data-testid={`pdf-page-slot-${page}`}
              className="absolute inset-x-0 scroll-mt-4 rounded-md border border-cockpit-line bg-white p-3 shadow-panel"
              style={{ minHeight: pageHeight - 16, top: (page - 1) * pageHeight }}
            >
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>Page {page}</span>
                {page === normalizePage(pageNumber, state.pageCount) ? (
                  <span className="rounded bg-blue-50 px-2 py-1 text-cockpit-blue">Citation target</span>
                ) : null}
              </div>
              <PdfPageCanvas
                key={`${sourceUri}-${page}`}
                pdf={state.pdf}
                pageNumber={page}
                sourceUri={sourceUri}
                onMeasured={handlePageMeasured}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function PdfPageCanvas({
  pdf,
  pageNumber,
  sourceUri,
  onMeasured
}: {
  pdf: PdfDocument;
  pageNumber: number;
  sourceUri: string;
  onMeasured: (height: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let renderTask: { promise: Promise<unknown>; cancel?: () => void } | null = null;

    async function renderPage() {
      setStatus("loading");

      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: PAGE_SCALE });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (!canvas || !context) {
          throw new Error("Canvas rendering is not available.");
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        onMeasured(viewport.height);

        renderTask = page.render({ canvas, canvasContext: context, viewport });
        await renderTask.promise;

        if (!cancelled) {
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          console.error("PDF page render failed", error instanceof Error ? error.message : String(error));
          setStatus("error");
        }
      }
    }

    const renderRun = renderQueueRef.current.catch(() => undefined).then(renderPage);
    renderQueueRef.current = renderRun.catch(() => undefined);

    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [pdf, pageNumber, sourceUri, onMeasured]);

  return (
    <div className="relative">
      {status === "loading" ? (
        <div className="absolute inset-x-0 top-3 text-center text-xs text-slate-500">Rendering page...</div>
      ) : null}
      {status === "error" ? (
        <div className="absolute inset-x-0 top-3 text-center text-xs text-cockpit-amber">Unable to render page.</div>
      ) : null}
      <canvas
        ref={canvasRef}
        data-testid={`pdf-page-canvas-${pageNumber}`}
        className="mx-auto block max-w-full rounded-sm bg-white"
      />
    </div>
  );
}

function ViewerStatus({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warning" }) {
  return (
    <div className="flex min-h-8 items-center justify-between border-b border-cockpit-line pb-3 text-xs text-slate-600">
      <span className={tone === "warning" ? "text-cockpit-amber" : undefined}>{children}</span>
    </div>
  );
}

function normalizePage(pageNumber: number | undefined, pageCount: number) {
  const parsedPage = Math.trunc(pageNumber || 1);
  return Math.min(Math.max(parsedPage || 1, 1), Math.max(pageCount, 1));
}
