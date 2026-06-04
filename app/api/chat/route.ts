import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aircraftStores, mockEvidence } from "@/lib/mock-data";
import { resolveCitationTarget } from "@/lib/citations/resolve";
import { hasLocalRagflowConfig, retrieveFromRagflow } from "@/lib/ragflow/adapter";
import { groupEvidenceByStore } from "@/lib/retrieval/grouping";

const chatSchema = z.object({
  question: z.string().min(1),
  storeIds: z.array(z.string()).min(1)
});

const CHAT_RETRIEVAL_LIMIT = 5;
const CITATION_LIMIT = 3;

export async function POST(request: NextRequest) {
  const parsed = chatSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
  }

  const stores = aircraftStores.filter((store) => parsed.data.storeIds.includes(store.id));

  if (stores.length !== parsed.data.storeIds.length) {
    return NextResponse.json({ error: "Unknown aircraft store" }, { status: 404 });
  }

  try {
    const evidenceGroups = await Promise.all(
      stores.map((store) => {
        if (hasLocalRagflowConfig(store)) {
          return retrieveFromRagflow(store, parsed.data.question, CHAT_RETRIEVAL_LIMIT);
        }

        return Promise.resolve(
          mockEvidence.filter((item) => item.storeId === store.id).slice(0, CHAT_RETRIEVAL_LIMIT)
        );
      })
    );

    const evidence = evidenceGroups.flat();
    const groups = groupEvidenceByStore(stores, evidence);

    if (evidence.length === 0) {
      return NextResponse.json({
        answer: "No approved evidence was retrieved for the selected aircraft store.",
        citations: [],
        groups
      });
    }

    const citations = evidence.slice(0, CITATION_LIMIT).map((item) => ({
      id: item.id,
      label: `${item.documentTitle}${item.pageNumber ? `, p. ${item.pageNumber}` : ""}`,
      target: resolveCitationTarget(item, item.documentId)
    }));

    return NextResponse.json({
      answer: buildGroundedStarterAnswer(evidence),
      citations,
      groups
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "RAGFlow retrieval failed" }, { status: 502 });
  }
}

function buildGroundedStarterAnswer(evidence: { content: string }[]) {
  const excerpts = evidence
    .map((item) => item.content.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (excerpts.length === 0) {
    return "Hermes found approved evidence, but the retrieved chunks did not include readable text.";
  }

  return excerpts.join("\n\n");
}
