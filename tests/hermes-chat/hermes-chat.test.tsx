/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HermesChat } from "@/components/hermes-chat/HermesChat";

describe("HermesChat", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps long agent responses inside an internal scrollable response window", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            answer: "Hydraulic system A powers ".repeat(80),
            citations: []
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    render(<HermesChat selectedStoreIds={["store-b737ng"]} onOpenSource={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Ask Hermes" }));

    const responseWindow = await screen.findByTestId("hermes-response-window");
    expect(responseWindow.className).toContain("overflow-y-auto");
    expect(responseWindow.className).toContain("max-h-");
  });

  it("renders summarized Hermes tool activity without raw tool output", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            answer: "Hydraulic system A powers the landing gear.",
            citations: [],
            events: [
              { label: "Search approved sources", status: "complete" },
              { label: "Rank evidence", status: "complete" },
              { label: "Generate answer", status: "complete" },
              { label: "Validate citations", status: "complete" }
            ],
            toolCalls: [
              {
                name: "searchApprovedSources",
                status: "complete",
                summary: "Searched 1 approved aircraft store and returned 1 evidence item."
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    render(<HermesChat selectedStoreIds={["store-b737ng"]} onOpenSource={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Ask Hermes" }));

    expect(await screen.findByText("Search approved sources")).toBeTruthy();
    expect(screen.getByText("Searched 1 approved aircraft store and returned 1 evidence item.")).toBeTruthy();
    expect(screen.queryByText("searchApprovedSources")).toBeNull();
  });

  it("renders Elasticsearch gateway activity without raw tool names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            answer: "Gateway evidence response.",
            citations: [],
            events: [{ label: "Search vector store", status: "complete" }],
            toolCalls: [
              {
                name: "searchHybridEvidence",
                status: "complete",
                summary: "Searched 1 approved aircraft store through the Hermes Elasticsearch Gateway and returned 1 evidence item."
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    render(<HermesChat selectedStoreIds={["store-b737ng"]} onOpenSource={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Ask Hermes" }));

    expect(await screen.findByText("Search vector store")).toBeTruthy();
    expect(screen.getByText(/Hermes Elasticsearch Gateway/)).toBeTruthy();
    expect(screen.queryByText("searchHybridEvidence")).toBeNull();
  });
});
