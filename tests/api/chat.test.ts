import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/chat/route";

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/chat", () => {
  it("rejects unknown aircraft stores", async () => {
    const response = await POST(
      jsonRequest({
        question: "What powers the yellow hydraulic system?",
        storeIds: ["not-a-store"]
      })
    );

    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Unknown aircraft store");
  });
});
