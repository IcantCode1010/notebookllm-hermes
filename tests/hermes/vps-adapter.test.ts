import { describe, expect, it, vi } from "vitest";
import { callHermesVpsAgent, hasHermesVpsConfig } from "@/lib/hermes/vps-adapter";
import { aircraftStores } from "@/lib/mock-data";

type FetchMock = ReturnType<typeof vi.fn<(url: URL, init: RequestInit) => Promise<Response>>>;

describe("hasHermesVpsConfig", () => {
  it("requires a base URL and API key", () => {
    expect(
      hasHermesVpsConfig({
        HERMES_API_BASE_URL: "http://hermes.test/v1",
        HERMES_API_KEY: "api-key"
      })
    ).toBe(true);
  });
});

describe("callHermesVpsAgent", () => {
  it("calls the Hermes OpenAI-compatible chat completions endpoint", async () => {
    const fetchMock: FetchMock = vi.fn(async () =>
      Response.json({
        id: "chatcmpl-test",
        choices: [
          {
            message: {
              role: "assistant",
              content:
                'Hermes grounded answer.\n\nHERMES_NOTEBOOK_JSON_START\n{"answer":"Hermes grounded answer.","citations":[{"id":"chunk-1","label":"05___029.PDF, p. 42","target":{"documentId":"doc-b737","pageNumber":42}}]}\nHERMES_NOTEBOOK_JSON_END'
            }
          }
        ]
      })
    );

    const result = await callHermesVpsAgent(
      {
        question: "What does hydraulic system A power?",
        stores: aircraftStores.filter((store) => store.id === "store-b737ng")
      },
      fetchMock as typeof fetch,
      {
        HERMES_API_BASE_URL: "http://hermes.test/v1",
        HERMES_API_KEY: "api-key",
        HERMES_MODEL: "hermes-agent",
        HERMES_GATEWAY_URL: "http://100.99.248.116:3000/api/gateway/tools"
      }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/v1/chat/completions", "http://hermes.test"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer api-key",
          "Content-Type": "application/json"
        })
      })
    );
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(requestBody.model).toBe("hermes-agent");
    expect(JSON.stringify(requestBody.messages)).toContain("searchHybridEvidence");
    expect(JSON.stringify(requestBody.messages)).toContain("mcp_notebookllm_searchHybridEvidence");
    expect(JSON.stringify(requestBody.messages)).toContain("Use exactly one mcp_notebookllm_searchHybridEvidence call");
    expect(JSON.stringify(requestBody.messages)).toContain("Do not call mcp_notebookllm_openSourceTarget unless");
    expect(JSON.stringify(requestBody.messages)).not.toContain("Use GET on the gateway URL");
    expect(JSON.stringify(requestBody.messages)).toContain("store-b737ng");
    expect(result.answer).toBe("Hermes grounded answer.");
    expect(result.citations).toEqual([
      {
        id: "chunk-1",
        label: "05___029.PDF, p. 42",
        target: {
          documentId: "doc-b737",
          pageNumber: 42
        }
      }
    ]);
    expect(result.events.map((event) => event.label)).toEqual([
      "Contact Hermes VPS",
      "Hermes searched gateway",
      "Generate answer",
      "Validate citations"
    ]);
  });

  it("falls back to plain assistant content when no structured block is returned", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Plain Hermes answer."
            }
          }
        ]
      })
    );

    const result = await callHermesVpsAgent(
      {
        question: "Summarize the source.",
        stores: aircraftStores.filter((store) => store.id === "store-b737ng")
      },
      fetchMock as typeof fetch,
      {
        HERMES_API_BASE_URL: "http://hermes.test",
        HERMES_API_KEY: "api-key"
      }
    );

    expect(result.answer).toBe("Plain Hermes answer.");
    expect(result.citations).toEqual([]);
  });

  it("uses prefetched evidence without asking Hermes to call retrieval tools", async () => {
    const fetchMock: FetchMock = vi.fn(async () =>
      Response.json({
        choices: [
          {
            message: {
              role: "assistant",
              content:
                'Fast answer.\n\nHERMES_NOTEBOOK_JSON_START\n{"answer":"Fast answer.","citations":[{"id":"chunk-fast","label":"05___029.PDF, p. 589","target":{"documentId":"doc-fast","pageNumber":589}}]}\nHERMES_NOTEBOOK_JSON_END'
            }
          }
        ]
      })
    );

    const result = await callHermesVpsAgent(
      {
        question: "What triggers volcanic ash inspection?",
        stores: aircraftStores.filter((store) => store.id === "store-b737ng"),
        prefetchedEvidence: [
          {
            id: "chunk-fast",
            storeId: "store-b737ng",
            aircraftCode: "B737NG",
            documentId: "doc-fast",
            documentTitle: "05___029.PDF",
            content: "Inspect the airplane if the flight path went through volcanic ash.",
            score: 12,
            pageNumber: 589
          }
        ]
      },
      fetchMock as typeof fetch,
      {
        HERMES_API_BASE_URL: "http://hermes.test/v1",
        HERMES_API_KEY: "api-key"
      }
    );

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const prompt = JSON.stringify(requestBody.messages);

    expect(prompt).toContain("Use the provided PREFETCHED_NOTEBOOK_EVIDENCE");
    expect(prompt).toContain("Do not call mcp_notebookllm_searchHybridEvidence");
    expect(prompt).toContain("Inspect the airplane if the flight path went through volcanic ash.");
    expect(result.answer).toBe("Fast answer.");
    expect(result.groups[0].items).toHaveLength(1);
  });

  it("truncates long prefetched evidence before sending it to Hermes", async () => {
    const fetchMock: FetchMock = vi.fn(async () =>
      Response.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Fast answer."
            }
          }
        ]
      })
    );

    await callHermesVpsAgent(
      {
        question: "Summarize.",
        stores: aircraftStores.filter((store) => store.id === "store-b737ng"),
        prefetchedEvidence: [
          {
            id: "chunk-long",
            storeId: "store-b737ng",
            aircraftCode: "B737NG",
            documentId: "doc-long",
            documentTitle: "05___029.PDF",
            content: "A".repeat(2_000),
            score: 1
          }
        ]
      },
      fetchMock as typeof fetch,
      {
        HERMES_API_BASE_URL: "http://hermes.test/v1",
        HERMES_API_KEY: "api-key"
      }
    );

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const prompt = JSON.stringify(requestBody.messages);

    expect(prompt).toContain("[truncated]");
    expect(prompt).not.toContain("A".repeat(1_400));
  });
});
