"use client";

import { FileText, Image as ImageIcon } from "lucide-react";
import type { CitationTarget, SourceDocument } from "@/lib/types";

type SourceViewerProps = {
  documents: SourceDocument[];
  activeCitation: CitationTarget | null;
};

export function SourceViewer({ documents, activeCitation }: SourceViewerProps) {
  const activeDocument = activeCitation
    ? documents.find((document) => document.id === activeCitation.documentId)
    : documents[0];

  return (
    <section className="min-h-[520px] border-b border-cockpit-line bg-cockpit-panel lg:border-b-0 lg:border-r">
      <div className="flex min-h-14 items-center justify-between border-b border-cockpit-line bg-white px-4">
        <div>
          <h2 className="text-sm font-semibold text-cockpit-navy">Source viewer</h2>
          <p className="text-xs text-slate-600">PDF pages, images, and citation highlights</p>
        </div>
      </div>

      <div className="p-4">
        {!activeDocument ? (
          <div className="rounded-md border border-dashed border-cockpit-line bg-white p-8 text-center text-sm text-slate-600">
            Select an approved document or citation to inspect the source.
          </div>
        ) : (
          <div className="rounded-md border border-cockpit-line bg-white shadow-panel">
            <div className="flex items-center gap-3 border-b border-cockpit-line p-4">
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
            <div className="min-h-[420px] p-4">
              <div className="flex h-[380px] items-center justify-center rounded-md border border-cockpit-line bg-slate-50 text-center">
                <div>
                  <div className="text-sm font-semibold text-cockpit-navy">
                    {activeDocument.documentType === "PDF" ? "PDF.js viewer target" : "OpenSeadragon image viewer target"}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {activeCitation?.pageNumber ? `Open page ${activeCitation.pageNumber}.` : "Open document overview."}
                  </div>
                  {activeCitation?.boundingBox ? (
                    <div className="mt-2 text-xs text-cockpit-amber">Highlight metadata available.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
