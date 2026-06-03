import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aircraftStores, mockEvidence } from "@/lib/mock-data";
import { groupEvidenceByStore } from "@/lib/retrieval/grouping";

const retrieveSchema = z.object({
  question: z.string().min(1),
  storeIds: z.array(z.string()).min(1),
  topK: z.number().int().min(1).max(20).default(5)
});

export async function POST(request: NextRequest) {
  const parsed = retrieveSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid retrieval request" }, { status: 400 });
  }

  const stores = aircraftStores.filter((store) => parsed.data.storeIds.includes(store.id));

  if (stores.length !== parsed.data.storeIds.length) {
    return NextResponse.json({ error: "Unknown aircraft store" }, { status: 404 });
  }

  const evidence = mockEvidence
    .filter((item) => parsed.data.storeIds.includes(item.storeId))
    .slice(0, parsed.data.topK);

  return NextResponse.json({
    groups: groupEvidenceByStore(stores, evidence)
  });
}
