import { z } from "zod";
import { aircraftStores } from "@/lib/mock-data";
import { searchHybridEvidence } from "@/lib/gateway/elasticsearch";
import type { CitationTarget } from "@/lib/types";

const searchHybridEvidenceSchema = z.object({
  query: z.string().min(1),
  storeIds: z.array(z.string()).min(1),
  topK: z.number().int().min(1).max(20).default(5)
});

const openSourceTargetSchema = z.object({
  documentId: z.string().min(1),
  pageNumber: z.number().int().min(1).optional(),
  imageId: z.string().min(1).optional()
});

export const hermesGatewayManifest = {
  name: "hermes-aviation-gateway",
  version: "0.1.0",
  description: "Read-only aviation retrieval tools for the Hermes NotebookLLM workspace.",
  tools: [
    {
      name: "searchHybridEvidence",
      description:
        "Search approved aircraft stores through the local Hermes Elasticsearch Gateway and return normalized evidence with document and page metadata.",
      inputSchema: {
        type: "object",
        required: ["query", "storeIds"],
        properties: {
          query: { type: "string" },
          storeIds: { type: "array", items: { type: "string" } },
          topK: { type: "number", minimum: 1, maximum: 20, default: 5 }
        }
      }
    },
    {
      name: "openSourceTarget",
      description: "Create a UI-safe source target that opens the full source document at a cited page or image.",
      inputSchema: {
        type: "object",
        required: ["documentId"],
        properties: {
          documentId: { type: "string" },
          pageNumber: { type: "number", minimum: 1 },
          imageId: { type: "string" }
        }
      }
    }
  ]
};

export async function executeHermesGatewayTool(tool: string, rawArguments: unknown) {
  if (tool === "searchHybridEvidence") {
    const parsed = searchHybridEvidenceSchema.safeParse(rawArguments);
    if (!parsed.success) {
      return { status: 400, body: { error: "Invalid searchHybridEvidence arguments" } };
    }

    const stores = aircraftStores.filter((store) => parsed.data.storeIds.includes(store.id));
    if (stores.length !== parsed.data.storeIds.length) {
      return { status: 404, body: { error: "Unknown aircraft store" } };
    }

    const evidenceGroups = await Promise.all(
      stores.map((store) => searchHybridEvidence(store, parsed.data.query, parsed.data.topK))
    );

    return {
      status: 200,
      body: {
        tool,
        result: {
          items: evidenceGroups.flat()
        }
      }
    };
  }

  if (tool === "openSourceTarget") {
    const parsed = openSourceTargetSchema.safeParse(rawArguments);
    if (!parsed.success) {
      return { status: 400, body: { error: "Invalid openSourceTarget arguments" } };
    }

    const target: CitationTarget = {
      documentId: parsed.data.documentId,
      pageNumber: parsed.data.pageNumber,
      imageId: parsed.data.imageId
    };

    return {
      status: 200,
      body: {
        tool,
        result: {
          target
        }
      }
    };
  }

  return { status: 404, body: { error: "Unknown gateway tool" } };
}

export function isAuthorizedGatewayRequest(authorizationHeader: string | null, token = process.env.HERMES_GATEWAY_TOKEN) {
  if (!token) {
    return true;
  }

  return authorizationHeader === `Bearer ${token}`;
}
