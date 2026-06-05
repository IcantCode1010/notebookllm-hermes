import type { AircraftStore, CitationTarget, EvidenceItem, GroupedEvidence } from "@/lib/types";
import { resolveCitationTarget } from "@/lib/citations/resolve";
import { hasElasticsearchGatewayConfig, searchHybridEvidence } from "@/lib/gateway/elasticsearch";
import { mockEvidence } from "@/lib/mock-data";
import { hasLocalRagflowConfig, retrieveFromRagflow } from "@/lib/ragflow/adapter";
import { groupEvidenceByStore } from "@/lib/retrieval/grouping";

type HermesAgentInput = {
  question: string;
  stores: AircraftStore[];
  requestedStoreIds?: string[];
};

type HermesActivityEvent = {
  label: "Search approved sources" | "Search vector store" | "Rank evidence" | "Generate answer" | "Validate citations";
  status: "complete";
};

type HermesToolCallSummary = {
  name: "searchApprovedSources" | "searchHybridEvidence" | "validateCitationTargets";
  status: "complete";
  summary: string;
};

type HermesCitation = {
  id: string;
  label: string;
  target: CitationTarget;
};

export type HermesAgentResult = {
  answer: string;
  citations: HermesCitation[];
  groups: GroupedEvidence[];
  events: HermesActivityEvent[];
  toolCalls: HermesToolCallSummary[];
};

const CHAT_RETRIEVAL_LIMIT = 5;
const CITATION_LIMIT = 3;

export async function runHermesAgent({ question, stores, requestedStoreIds }: HermesAgentInput): Promise<HermesAgentResult> {
  const allowedStoreIds = new Set(stores.map((store) => store.id));
  const toolStoreIds = requestedStoreIds || stores.map((store) => store.id);

  for (const storeId of toolStoreIds) {
    if (!allowedStoreIds.has(storeId)) {
      throw new Error("Hermes tool request included an unapproved aircraft store");
    }
  }

  const selectedToolStores = stores.filter((store) => toolStoreIds.includes(store.id));
  const gatewayEnabled = selectedToolStores.some((store) => hasElasticsearchGatewayConfig(store));
  const evidence = await searchApprovedSources(question, selectedToolStores, CHAT_RETRIEVAL_LIMIT);
  const rankedEvidence = rankEvidence(evidence);
  const groups = groupEvidenceByStore(stores, rankedEvidence);
  const answer = generateGroundedAnswer(rankedEvidence);
  const citations = validateCitationTargets(
    rankedEvidence.slice(0, CITATION_LIMIT).map((item) => ({
      id: item.id,
      label: `${item.documentTitle}${item.pageNumber ? `, p. ${item.pageNumber}` : ""}`,
      target: resolveCitationTarget(item, item.documentId)
    }))
  );

  return {
    answer,
    citations,
    groups,
    events: [
      { label: gatewayEnabled ? "Search vector store" : "Search approved sources", status: "complete" },
      { label: "Rank evidence", status: "complete" },
      { label: "Generate answer", status: "complete" },
      { label: "Validate citations", status: "complete" }
    ],
    toolCalls: [
      gatewayEnabled
        ? {
            name: "searchHybridEvidence",
            status: "complete",
            summary: `Searched ${selectedToolStores.length} approved aircraft ${pluralize("store", selectedToolStores.length)} through the Hermes Elasticsearch Gateway and returned ${evidence.length} evidence ${pluralize("item", evidence.length)}.`
          }
        : {
            name: "searchApprovedSources",
            status: "complete",
            summary: `Searched ${selectedToolStores.length} approved aircraft ${pluralize("store", selectedToolStores.length)} and returned ${evidence.length} evidence ${pluralize("item", evidence.length)}.`
          },
      {
        name: "validateCitationTargets",
        status: "complete",
        summary: `Validated ${citations.length} citation ${pluralize("target", citations.length)}.`
      }
    ]
  };
}

async function searchApprovedSources(question: string, stores: AircraftStore[], topK: number) {
  const evidenceGroups = await Promise.all(
    stores.map((store) => {
      if (hasElasticsearchGatewayConfig(store)) {
        return searchHybridEvidence(store, question, topK);
      }

      if (hasLocalRagflowConfig(store)) {
        return retrieveFromRagflow(store, question, topK);
      }

      return Promise.resolve(mockEvidence.filter((item) => item.storeId === store.id).slice(0, topK));
    })
  );

  return evidenceGroups.flat();
}

function rankEvidence(evidence: EvidenceItem[]) {
  return [...evidence].sort((a, b) => b.score - a.score);
}

function generateGroundedAnswer(evidence: EvidenceItem[]) {
  if (evidence.length === 0) {
    return "No approved evidence was retrieved for the selected aircraft store.";
  }

  const excerpts = evidence
    .map((item) => item.content.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (excerpts.length === 0) {
    return "Hermes found approved evidence, but the retrieved chunks did not include readable text.";
  }

  return excerpts.join("\n\n");
}

function validateCitationTargets(citations: HermesCitation[]) {
  return citations.filter((citation) => citation.target.documentId);
}

function pluralize(noun: string, count: number) {
  return count === 1 ? noun : `${noun}s`;
}
