import type { CitationTarget, EvidenceItem } from "@/lib/types";

export function resolveCitationTarget(evidence: EvidenceItem, expectedDocumentId?: string): CitationTarget {
  if (expectedDocumentId && evidence.documentId !== expectedDocumentId) {
    throw new Error(`Citation points to unknown document ${evidence.documentId}`);
  }

  return {
    documentId: evidence.documentId,
    pageNumber: evidence.pageNumber,
    boundingBox: evidence.boundingBox,
    imageId: evidence.imageId
  };
}
