import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/retrieve/route";

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/retrieve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/retrieve", () => {
  it("applies topK per selected aircraft store", async () => {
    const response = await POST(
      jsonRequest({
        question: "Compare hydraulic architecture.",
        storeIds: ["store-a320", "store-b737ng"],
        topK: 1
      })
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.groups).toHaveLength(2);
    expect(body.groups[0].items).toHaveLength(1);
    expect(body.groups[1].items).toHaveLength(1);
  });
});
