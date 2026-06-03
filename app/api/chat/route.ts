import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aircraftStores, mockEvidence } from "@/lib/mock-data";
import { resolveCitationTarget } from "@/lib/citations/resolve";
import { groupEvidenceByStore } from "@/lib/retrieval/grouping";

const chatSchema = z.object({
  question: z.string().min(1),
  storeIds: z.array(z.string()).min(1)
});

export async function POST(request: NextRequest) {
  const parsed = chatSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
  }

  const stores = aircraftStores.filter((store) => parsed.data.storeIds.includes(store.id));

  if (stores.length !== parsed.data.storeIds.length) {
    return NextResponse.json({ error: "Unknown aircraft store" }, { status: 404 });
  }

  const evidence = mockEvidence.filter((item) => parsed.data.storeIds.includes(item.storeId));
  const groups = groupEvidenceByStore(stores, evidence);

  if (evidence.length === 0) {
    return NextResponse.json({
      answer: "No approved evidence was retrieved for the selected aircraft store.",
      citations: [],
      groups
    });
  }

  const first = evidence[0];
  const target = resolveCitationTarget(first, first.documentId);

  return NextResponse.json({
    answer:
      "Hermes found scoped evidence in the selected aircraft store. This starter response is mocked until the server-side Hermes adapter is connected.",
    citations: [
      {
        id: first.id,
        label: `${first.documentTitle}${first.pageNumber ? `, p. ${first.pageNumber}` : ""}`,
        target
      }
    ],
    groups
  });
}
