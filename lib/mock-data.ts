import type { AircraftStore, EvidenceItem, SourceDocument } from "@/lib/types";

export const aircraftStores: AircraftStore[] = [
  {
    id: "store-a320",
    name: "Airbus A320",
    aircraftCode: "A320",
    ragflowDatasetId: "ragflow-a320-demo",
    status: "ACTIVE"
  },
  {
    id: "store-b737ng",
    name: "Boeing 737 NG",
    aircraftCode: "B737NG",
    ragflowDatasetId: "ragflow-b737ng-demo",
    status: "ACTIVE"
  }
];

export const sourceDocuments: SourceDocument[] = [
  {
    id: "doc-a320-fcom",
    storeId: "store-a320",
    title: "A320 FCOM - Hydraulics",
    documentType: "PDF",
    status: "PUBLISHED",
    sourceUri: "/sources/a320-fcom-hydraulics.pdf",
    pageCount: 124
  },
  {
    id: "doc-a320-elec",
    storeId: "store-a320",
    title: "A320 Electrical Bus Diagram",
    documentType: "IMAGE",
    status: "PUBLISHED",
    sourceUri: "/sources/a320-electrical-bus.png"
  },
  {
    id: "doc-b737ng-fcom",
    storeId: "store-b737ng",
    title: "B737 NG FCOM - Hydraulics",
    documentType: "PDF",
    status: "PUBLISHED",
    sourceUri: "/sources/b737ng-fcom-hydraulics.pdf",
    pageCount: 98
  }
];

export const mockEvidence: EvidenceItem[] = [
  {
    id: "ev-a320-yellow-hyd",
    storeId: "store-a320",
    aircraftCode: "A320",
    documentId: "doc-a320-fcom",
    documentTitle: "A320 FCOM - Hydraulics",
    content: "The yellow hydraulic system can be pressurized by the engine driven pump, electric pump, or PTU depending on aircraft state.",
    score: 0.91,
    pageNumber: 42,
    boundingBox: { x: 0.18, y: 0.34, width: 0.42, height: 0.12 }
  },
  {
    id: "ev-a320-elec-diagram",
    storeId: "store-a320",
    aircraftCode: "A320",
    documentId: "doc-a320-elec",
    documentTitle: "A320 Electrical Bus Diagram",
    content: "The diagram evidence is indexed from image caption, OCR text, and nearby page context.",
    score: 0.83,
    imageId: "img-a320-elec-bus"
  },
  {
    id: "ev-b737ng-hyd-a",
    storeId: "store-b737ng",
    aircraftCode: "B737NG",
    documentId: "doc-b737ng-fcom",
    documentTitle: "B737 NG FCOM - Hydraulics",
    content: "B737 NG hydraulic system A normally powers primary flight controls, landing gear, and other aircraft systems.",
    score: 0.88,
    pageNumber: 31
  }
];
