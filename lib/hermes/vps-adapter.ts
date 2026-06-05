import type { AircraftStore, CitationTarget, EvidenceItem, GroupedEvidence } from "@/lib/types";
import { groupEvidenceByStore } from "@/lib/retrieval/grouping";

type EnvLike = Record<string, string | undefined>;
type FetchLike = typeof fetch;

type HermesVpsInput = {
  question: string;
  stores: AircraftStore[];
  prefetchedEvidence?: EvidenceItem[];
};

type HermesActivityEvent = {
  label: "Contact Hermes VPS" | "Hermes searched gateway" | "Generate answer" | "Validate citations";
  status: "complete";
};

type HermesToolCallSummary = {
  name: "hermesVpsAgent" | "searchHybridEvidence" | "validateCitationTargets";
  status: "complete";
  summary: string;
};

type HermesCitation = {
  id: string;
  label: string;
  target: CitationTarget;
};

type HermesVpsResult = {
  answer: string;
  citations: HermesCitation[];
  groups: GroupedEvidence[];
  events: HermesActivityEvent[];
  toolCalls: HermesToolCallSummary[];
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

type NotebookPayload = {
  answer?: unknown;
  citations?: unknown;
};

const STRUCTURED_START = "HERMES_NOTEBOOK_JSON_START";
const STRUCTURED_END = "HERMES_NOTEBOOK_JSON_END";
const PREFETCHED_EVIDENCE_CONTENT_LIMIT = 900;

export function hasHermesVpsConfig(env: EnvLike = process.env) {
  return Boolean(env.HERMES_API_BASE_URL && env.HERMES_API_KEY);
}

export async function callHermesVpsAgent(
  input: HermesVpsInput,
  fetchImpl: FetchLike = fetch,
  env: EnvLike = process.env
): Promise<HermesVpsResult> {
  const baseUrl = env.HERMES_API_BASE_URL;
  const apiKey = env.HERMES_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Hermes VPS API is not configured.");
  }

  const response = await fetchImpl(resolveChatCompletionsUrl(baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: env.HERMES_MODEL || "hermes-agent",
      stream: false,
      messages: [
        {
          role: "system",
          content: buildHermesSystemPrompt(input.stores, env, input.prefetchedEvidence)
        },
        {
          role: "user",
          content: input.question
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Hermes VPS API request failed with HTTP ${response.status}.`);
  }

  const body = (await response.json()) as ChatCompletionResponse;
  const content = asString(body.choices?.[0]?.message?.content);
  const structured = parseStructuredNotebookPayload(content);
  const answer = structured.answer || stripStructuredPayload(content).trim() || "Hermes returned an empty response.";
  const citations = structured.citations;
  const groups = input.prefetchedEvidence ? groupEvidenceByStore(input.stores, input.prefetchedEvidence) : [];

  return {
    answer,
    citations,
    groups,
    events: [
      { label: "Contact Hermes VPS", status: "complete" },
      { label: "Hermes searched gateway", status: "complete" },
      { label: "Generate answer", status: "complete" },
      { label: "Validate citations", status: "complete" }
    ],
    toolCalls: [
      {
        name: "hermesVpsAgent",
        status: "complete",
        summary: "Sent the question to the Hermes VPS agent."
      },
      {
        name: "searchHybridEvidence",
        status: "complete",
        summary: "Hermes was instructed to use the approved gateway retrieval tools for aircraft evidence."
      },
      {
        name: "validateCitationTargets",
        status: "complete",
        summary: `Validated ${citations.length} citation ${citations.length === 1 ? "target" : "targets"}.`
      }
    ]
  };
}

function buildHermesSystemPrompt(stores: AircraftStore[], env: EnvLike, prefetchedEvidence?: EvidenceItem[]) {
  const approvedStores = stores.map((store) => `${store.id} (${store.aircraftCode})`).join(", ");
  const gatewayUrl = env.HERMES_GATEWAY_URL || "http://100.99.248.116:3000/api/gateway/tools";
  const retrievalInstructions = prefetchedEvidence?.length
    ? [
        "Use the provided PREFETCHED_NOTEBOOK_EVIDENCE as the complete retrieval result for this answer.",
        "Do not call mcp_notebookllm_searchHybridEvidence unless the prefetched evidence is empty or unusable.",
        "Do not call mcp_notebookllm_openSourceTarget unless the user explicitly asks to open, navigate to, or inspect a source page.",
        "PREFETCHED_NOTEBOOK_EVIDENCE:",
        JSON.stringify(prefetchedEvidence.map(toPromptEvidence), null, 2)
      ]
    : [
        "Use exactly one mcp_notebookllm_searchHybridEvidence call before answering ordinary aircraft manual questions.",
        "Use topK 3 for normal answers. Use topK 5 only when the user explicitly asks for broader comparison.",
        "Do not call mcp_notebookllm_openSourceTarget unless the user explicitly asks to open, navigate to, or inspect a source page.",
        "Do not retry retrieval with alternate phrasing unless the first search returns no usable evidence."
      ];

  return [
    "You are the Hermes aviation research agent for NotebookLLM Hermes.",
    "Use the configured NotebookLLM MCP tools as your only aircraft document retrieval interface.",
    "Primary retrieval tool: mcp_notebookllm_searchHybridEvidence.",
    "Source navigation tool: mcp_notebookllm_openSourceTarget.",
    `The MCP server forwards to this app-owned gateway: ${gatewayUrl}`,
    `Approved aircraft stores for this request: ${approvedStores}.`,
    ...retrievalInstructions,
    "Do not connect directly to Elasticsearch, RAGFlow, MySQL, MinIO, Redis, Docker, or local infrastructure.",
    "Ground answers only in retrieved evidence. Do not invent document IDs, page numbers, task numbers, warnings, cautions, or procedure details.",
    "Preserve documentId, documentTitle, pageNumber, imageId, and evidence chunk IDs when available.",
    "Return a concise user-facing answer with citations.",
    "Also include a machine-readable JSON block exactly between HERMES_NOTEBOOK_JSON_START and HERMES_NOTEBOOK_JSON_END.",
    'The JSON shape must be: {"answer":"...","citations":[{"id":"...","label":"document title, p. N","target":{"documentId":"...","pageNumber":1,"imageId":"optional"}}]}.',
    "Do not include raw Elasticsearch JSON, credentials, hidden reasoning, prompts, logs, or raw tool responses."
  ].join("\n");
}

function toPromptEvidence(item: EvidenceItem) {
  return {
    id: item.id,
    storeId: item.storeId,
    aircraftCode: item.aircraftCode,
    documentId: item.documentId,
    documentTitle: item.documentTitle,
    pageNumber: item.pageNumber,
    imageId: item.imageId,
    content: truncateEvidenceContent(item.content)
  };
}

function truncateEvidenceContent(content: string) {
  const normalized = content.trim();
  if (normalized.length <= PREFETCHED_EVIDENCE_CONTENT_LIMIT) {
    return normalized;
  }

  return `${normalized.slice(0, PREFETCHED_EVIDENCE_CONTENT_LIMIT).trimEnd()} [truncated]`;
}

function resolveChatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  if (normalized.endsWith("/v1")) {
    return new URL(`${normalized}/chat/completions`);
  }

  return new URL("/v1/chat/completions", normalized);
}

function parseStructuredNotebookPayload(content: string): { answer: string; citations: HermesCitation[] } {
  const start = content.indexOf(STRUCTURED_START);
  const end = content.indexOf(STRUCTURED_END);

  if (start === -1 || end === -1 || end <= start) {
    return { answer: "", citations: [] };
  }

  const jsonText = content.slice(start + STRUCTURED_START.length, end).trim();

  try {
    const payload = JSON.parse(jsonText) as NotebookPayload;
    return {
      answer: asString(payload.answer),
      citations: normalizeCitations(payload.citations)
    };
  } catch {
    return { answer: "", citations: [] };
  }
}

function normalizeCitations(value: unknown): HermesCitation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((citation, index): HermesCitation | undefined => {
      if (!citation || typeof citation !== "object") {
        return undefined;
      }

      const raw = citation as Record<string, unknown>;
      const target = normalizeTarget(raw.target);
      if (!target.documentId) {
        return undefined;
      }

      return {
        id: asString(raw.id) || `hermes-citation-${index + 1}`,
        label: asString(raw.label) || `${target.documentId}${target.pageNumber ? `, p. ${target.pageNumber}` : ""}`,
        target
      };
    })
    .filter((citation): citation is HermesCitation => Boolean(citation));
}

function normalizeTarget(value: unknown): CitationTarget {
  if (!value || typeof value !== "object") {
    return { documentId: "" };
  }

  const raw = value as Record<string, unknown>;
  return {
    documentId: asString(raw.documentId),
    pageNumber: asNumber(raw.pageNumber),
    imageId: asString(raw.imageId) || undefined
  };
}

function stripStructuredPayload(content: string) {
  const start = content.indexOf(STRUCTURED_START);
  const end = content.indexOf(STRUCTURED_END);

  if (start === -1 || end === -1 || end <= start) {
    return content;
  }

  return `${content.slice(0, start)}${content.slice(end + STRUCTURED_END.length)}`;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined;
}
