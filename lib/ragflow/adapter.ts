import type { AircraftStore, BoundingBox, EvidenceItem, SourceDocument } from "@/lib/types";

type EnvLike = Record<string, string | undefined>;

type RagflowChunk = {
  id?: unknown;
  content?: unknown;
  document_id?: unknown;
  document_keyword?: unknown;
  image_id?: unknown;
  positions?: unknown;
  similarity?: unknown;
};

type RagflowDocAgg = {
  doc_id?: unknown;
  doc_name?: unknown;
  count?: unknown;
};

export type RagflowRetrievalResponse = {
  code?: unknown;
  message?: unknown;
  data?: {
    chunks?: RagflowChunk[];
    doc_aggs?: RagflowDocAgg[];
    total?: unknown;
  };
};

type FetchLike = typeof fetch;

type RagflowDocument = {
  id?: unknown;
  name?: unknown;
  display_name?: unknown;
  filename?: unknown;
  document_name?: unknown;
  type?: unknown;
  chunk_num?: unknown;
  chunk_count?: unknown;
  size?: unknown;
};

type RagflowDocumentsResponse = {
  code?: unknown;
  message?: unknown;
  data?: {
    docs?: RagflowDocument[];
    documents?: RagflowDocument[];
  } | RagflowDocument[];
};

export function resolveStoreDatasetId(store: AircraftStore, env: EnvLike = process.env) {
  const storeKey = `RAGFLOW_DATASET_${store.id.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
  const aircraftKey = `RAGFLOW_DATASET_${store.aircraftCode.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;

  return env[storeKey] || env[aircraftKey] || store.ragflowDatasetId;
}

export function hasLocalRagflowConfig(store: AircraftStore, env: EnvLike = process.env) {
  const datasetId = resolveStoreDatasetId(store, env);

  return Boolean(env.RAGFLOW_BASE_URL && env.RAGFLOW_API_KEY && datasetId && !datasetId.endsWith("-demo"));
}

export async function retrieveFromRagflow(
  store: AircraftStore,
  question: string,
  topK: number,
  fetchImpl: FetchLike = fetch,
  env: EnvLike = process.env
) {
  const baseUrl = env.RAGFLOW_BASE_URL;
  const apiKey = env.RAGFLOW_API_KEY;
  const datasetId = resolveStoreDatasetId(store, env);

  if (!baseUrl || !apiKey) {
    throw new Error("RAGFlow is not configured.");
  }

  const response = await fetchImpl(new URL("/api/v1/retrieval", baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      question,
      dataset_ids: [datasetId],
      page: 1,
      page_size: topK,
      top_k: 1024,
      highlight: true
    })
  });

  if (!response.ok) {
    throw new Error(`RAGFlow retrieval request failed with HTTP ${response.status}.`);
  }

  return normalizeRagflowRetrieval(store, (await response.json()) as RagflowRetrievalResponse);
}

export async function listDocumentsFromRagflow(
  store: AircraftStore,
  fetchImpl: FetchLike = fetch,
  env: EnvLike = process.env
): Promise<SourceDocument[]> {
  const baseUrl = env.RAGFLOW_BASE_URL;
  const apiKey = env.RAGFLOW_API_KEY;
  const datasetId = resolveStoreDatasetId(store, env);

  if (!baseUrl || !apiKey) {
    throw new Error("RAGFlow is not configured.");
  }

  const response = await fetchImpl(new URL(`/api/v1/datasets/${datasetId}/documents?page=1&page_size=1000`, baseUrl), {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`RAGFlow document request failed with HTTP ${response.status}.`);
  }

  return normalizeRagflowDocuments(store, (await response.json()) as RagflowDocumentsResponse);
}

export function normalizeRagflowDocuments(store: AircraftStore, response: RagflowDocumentsResponse): SourceDocument[] {
  if (response.code !== undefined && response.code !== 0) {
    const message = typeof response.message === "string" && response.message ? response.message : "unknown error";
    throw new Error(`RAGFlow document listing failed: ${message}`);
  }

  const rawDocuments = Array.isArray(response.data)
    ? response.data
    : response.data?.docs || response.data?.documents || [];

  return rawDocuments
    .map((document, index): SourceDocument => {
      const id = asString(document.id) || `ragflow-document-${index + 1}`;
      const title =
        asString(document.name) ||
        asString(document.display_name) ||
        asString(document.filename) ||
        asString(document.document_name) ||
        "RAGFlow document";

      return {
        id,
        storeId: store.id,
        title,
        documentType: documentTypeFor(title, asString(document.type)),
        status: "PUBLISHED",
        sourceUri: `/api/sources/${encodeURIComponent(id)}`,
        chunkCount: asNumber(document.chunk_num) ?? asNumber(document.chunk_count),
        sizeBytes: asNumber(document.size)
      };
    })
    .filter((document) => document.id.length > 0);
}

export function normalizeRagflowRetrieval(store: AircraftStore, response: RagflowRetrievalResponse): EvidenceItem[] {
  if (response.code !== 0) {
    const message = typeof response.message === "string" && response.message ? response.message : "unknown error";
    throw new Error(`RAGFlow retrieval failed: ${message}`);
  }

  const docNames = new Map<string, string>();
  for (const doc of response.data?.doc_aggs ?? []) {
    const id = asString(doc.doc_id);
    const name = asString(doc.doc_name);
    if (id && name) {
      docNames.set(id, name);
    }
  }

  return (response.data?.chunks ?? []).map((chunk, index) => {
    const documentId = asString(chunk.document_id) || `ragflow-document-${index + 1}`;
    const documentTitle = docNames.get(documentId) || asString(chunk.document_keyword) || "RAGFlow document";
    const position = firstPosition(chunk.positions);

    return {
      id: asString(chunk.id) || `ragflow-chunk-${index + 1}`,
      storeId: store.id,
      aircraftCode: store.aircraftCode,
      documentId,
      documentTitle,
      content: asString(chunk.content),
      score: asNumber(chunk.similarity) ?? 0,
      pageNumber: position?.pageNumber,
      boundingBox: position?.boundingBox,
      imageId: asString(chunk.image_id) || undefined
    };
  });
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function documentTypeFor(title: string, type: string): SourceDocument["documentType"] {
  const normalized = `${title} ${type}`.toLowerCase();
  if (normalized.includes(".pdf") || normalized.includes("pdf")) {
    return "PDF";
  }

  if (
    normalized.includes(".png") ||
    normalized.includes(".jpg") ||
    normalized.includes(".jpeg") ||
    normalized.includes(".webp") ||
    normalized.includes("image")
  ) {
    return "IMAGE";
  }

  return "PDF";
}

function firstPosition(value: unknown): { pageNumber?: number; boundingBox?: BoundingBox } | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const first = value[0];
  if (typeof first === "string") {
    const parsed = first.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
    return positionFromNumbers(parsed);
  }

  if (Array.isArray(first)) {
    return positionFromNumbers(first);
  }

  return undefined;
}

function positionFromNumbers(raw: unknown[]) {
  const numbers = raw.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (numbers.length === 0) {
    return undefined;
  }

  const pageNumber = Math.trunc(numbers[0]);
  if (numbers.length < 5) {
    return { pageNumber };
  }

  const [, x1, x2, y1, y2] = numbers;
  return {
    pageNumber,
    boundingBox: {
      x: x1,
      y: y1,
      width: Math.max(0, x2 - x1),
      height: Math.max(0, y2 - y1)
    }
  };
}
