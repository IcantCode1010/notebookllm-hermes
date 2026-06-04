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
});
