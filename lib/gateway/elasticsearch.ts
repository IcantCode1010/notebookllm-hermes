import type { AircraftStore, BoundingBox, EvidenceItem } from "@/lib/types";

type EnvLike = Record<string, string | undefined>;
type FetchLike = typeof fetch;

type ElasticsearchHit = {
  _id?: unknown;
  _score?: unknown;
  _source?: {
    content_with_weight?: unknown;
    content_ltks?: unknown;
    doc_id?: unknown;
    docnm_kwd?: unknown;
    img_id?: unknown;
    page_num_int?: unknown;
    position_int?: unknown;
  };
};

type ElasticsearchSearchResponse = {
  hits?: {
    hits?: ElasticsearchHit[];
  };
};

export function hasElasticsearchGatewayConfig(store: AircraftStore, env: EnvLike = process.env) {
  return Boolean(
    env.HERMES_ELASTICSEARCH_BASE_URL &&
      env.HERMES_ELASTICSEARCH_USERNAME &&
      env.HERMES_ELASTICSEARCH_PASSWORD &&
      resolveStoreIndexName(store, env)
  );
}

export async function searchHybridEvidence(
  store: AircraftStore,
  query: string,
  topK: number,
  fetchImpl: FetchLike = fetch,
  env: EnvLike = process.env
): Promise<EvidenceItem[]> {
  const baseUrl = env.HERMES_ELASTICSEARCH_BASE_URL;
  const username = env.HERMES_ELASTICSEARCH_USERNAME;
  const password = env.HERMES_ELASTICSEARCH_PASSWORD;
  const indexName = resolveStoreIndexName(store, env);

  if (!baseUrl || !username || !password || !indexName) {
    throw new Error("Hermes Elasticsearch Gateway is not configured.");
  }

  const response = await fetchImpl(new URL(`/${encodeURIComponent(indexName)}/_search`, baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuth(username, password)
    },
    body: JSON.stringify(buildKeywordSearchBody(query, topK))
  });

  if (!response.ok) {
    throw new Error(`Hermes Elasticsearch Gateway search failed with HTTP ${response.status}.`);
  }

  return normalizeElasticsearchEvidence(store, (await response.json()) as ElasticsearchSearchResponse);
}

export function normalizeElasticsearchEvidence(
  store: AircraftStore,
  response: ElasticsearchSearchResponse
): EvidenceItem[] {
  return (response.hits?.hits ?? []).map((hit, index) => {
    const source = hit._source ?? {};
    const position = firstPosition(source.position_int);

    return {
      id: asString(hit._id) || `es-chunk-${index + 1}`,
      storeId: store.id,
      aircraftCode: store.aircraftCode,
      documentId: asString(source.doc_id) || `es-document-${index + 1}`,
      documentTitle: asString(source.docnm_kwd) || "Elasticsearch document",
      content: asString(source.content_with_weight) || asString(source.content_ltks),
      score: asNumber(hit._score) ?? 0,
      pageNumber: position?.pageNumber ?? firstPageNumber(source.page_num_int),
      boundingBox: position?.boundingBox,
      imageId: asString(source.img_id) || undefined
    };
  });
}

function resolveStoreIndexName(store: AircraftStore, env: EnvLike) {
  const storeKey = `HERMES_ELASTICSEARCH_INDEX_${store.id.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
  const aircraftKey = `HERMES_ELASTICSEARCH_INDEX_${store.aircraftCode.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;

  return env[storeKey] || env[aircraftKey];
}

function buildKeywordSearchBody(query: string, topK: number) {
  return {
    size: topK,
    _source: {
      excludes: ["q_*_vec"]
    },
    query: {
      bool: {
        should: [
          {
            match: {
              content_ltks: {
                query,
                boost: 3
              }
            }
          },
          {
            match: {
              content_sm_ltks: {
                query,
                boost: 2
              }
            }
          },
          {
            match: {
              title_tks: {
                query,
                boost: 1.5
              }
            }
          },
          {
            match: {
              title_sm_tks: {
                query,
                boost: 1.5
              }
            }
          },
          {
            match: {
              docnm_kwd: {
                query,
                boost: 1
              }
            }
          }
        ],
        minimum_should_match: 1
      }
    }
  };
}

function basicAuth(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function firstPageNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const first = value.find((item) => typeof item === "number" && Number.isFinite(item));
  return typeof first === "number" ? Math.trunc(first) : undefined;
}

function firstPosition(value: unknown): { pageNumber?: number; boundingBox?: BoundingBox } | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const first = value[0];
  if (!Array.isArray(first)) {
    return undefined;
  }

  const numbers = first.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
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
