"use client";

import React from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import type { CitationTarget, SourceDocument } from "@/lib/types";
import { PdfCanvasViewer } from "@/components/source-viewer/PdfCanvasViewer";

type SourceViewerProps = {
  documents: SourceDocument[];
  activeCitation: CitationTarget | null;
  activeDocument?: SourceDocument | null;
};

export function SourceViewer({ documents, activeCitation, activeDocument: manuallyOpenedDocument = null }: SourceViewerProps) {
  const matchedDocument = activeCitation
    ? documents.find((document) => document.id === activeCitation.documentId)
    : manuallyOpenedDocument || documents[0];
  const activeDocument = matchedDocument || documentFromCitation(activeCitation);
  const shouldRenderPdf =
    activeDocument?.documentType === "PDF" && (Boolean(activeCitation) || activeDocument.sourceUri.startsWith("/api/sources/"));

  return (
    <section className="flex h-full min-h-0 flex-col border-b border-cockpit-line bg-cockpit-panel lg:border-b-0 lg:border-r">
      <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-cockpit-line bg-white px-4">
        <div>
          <h2 className="text-sm font-semibold text-cockpit-navy">Source viewer</h2>
          <p className="text-xs text-slate-600">PDF pages, images, and citation highlights</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-3">
        {!activeDocument ? (
          <div className="rounded-md border border-dashed border-cockpit-line bg-white p-8 text-center text-sm text-slate-600">
            Select an approved document or citation to inspect the source.
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col rounded-md border border-cockpit-line bg-white shadow-panel">
            <div className="flex shrink-0 items-center gap-3 border-b border-cockpit-line p-3">
              {activeDocument.documentType === "IMAGE" ? (
                <ImageIcon className="h-5 w-5 text-cockpit-blue" />
              ) : (
                <FileText className="h-5 w-5 text-cockpit-blue" />
              )}
              <div>
                <div className="font-semibold text-cockpit-navy">{activeDocument.title}</div>
                <div className="text-xs text-slate-600">{activeDocument.sourceUri}</div>
              </div>
            </div>
            <div className="min-h-0 flex-1 p-3">
              {shouldRenderPdf ? (
                <PdfCanvasViewer
                  sourceUri={activeDocument.sourceUri}
                  pageNumber={activeCitation?.pageNumber}
                  boundingBox={activeCitation?.boundingBox}
                />
              ) : (
                <div className="flex h-[380px] items-center justify-center rounded-md border border-cockpit-line bg-slate-50 text-center">
                  <div>
                    <div className="text-sm font-semibold text-cockpit-navy">
                      {activeDocument.documentType === "PDF" ? "PDF source overview" : "OpenSeadragon image viewer target"}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {activeDocument.documentType === "PDF"
                        ? "Open document overview."
                        : activeCitation?.imageId
                          ? `Open image ${activeCitation.imageId}.`
                          : "Open image overview."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function documentFromCitation(activeCitation: CitationTarget | null): SourceDocument | undefined {
  if (!activeCitation?.documentId) {
    return undefined;
  }

  return {
    id: activeCitation.documentId,
    storeId: "retrieved-source",
    title: "Retrieved PDF source",
    documentType: "PDF",
    status: "PUBLISHED",
    sourceUri: `/api/sources/${encodeURIComponent(activeCitation.documentId)}`
  };
}
