export type UserRole = "END_USER" | "ADMIN" | "REVIEWER";

export type AircraftStore = {
  id: string;
  name: string;
  aircraftCode: string;
  ragflowDatasetId: string;
  status: "ACTIVE" | "ARCHIVED";
};

export type SourceDocument = {
  id: string;
  storeId: string;
  title: string;
  documentType: "PDF" | "IMAGE" | "MIXED";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sourceUri: string;
  pageCount?: number;
};

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EvidenceItem = {
  id: string;
  storeId: string;
  aircraftCode: string;
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
  pageNumber?: number;
  boundingBox?: BoundingBox;
  imageId?: string;
};

export type GroupedEvidence = {
  storeId: string;
  aircraftCode: string;
  items: EvidenceItem[];
};

export type CitationTarget = {
  documentId: string;
  pageNumber?: number;
  boundingBox?: BoundingBox;
  imageId?: string;
};
