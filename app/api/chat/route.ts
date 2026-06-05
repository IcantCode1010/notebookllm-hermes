import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aircraftStores } from "@/lib/mock-data";
import { runHermesAgent } from "@/lib/hermes/agent";
import { callHermesVpsAgent, hasHermesVpsConfig } from "@/lib/hermes/vps-adapter";

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

  try {
    if (hasHermesVpsConfig()) {
      if (process.env.HERMES_CHAT_RETRIEVAL_MODE === "server_prefetch") {
        const retrieval = await runHermesAgent({ question: parsed.data.question, stores });
        const prefetchedEvidence = retrieval.groups.flatMap((group) => group.items).slice(0, 3);

        return NextResponse.json(
          await callHermesVpsAgent({
            question: parsed.data.question,
            stores,
            prefetchedEvidence
          })
        );
      }

      return NextResponse.json(await callHermesVpsAgent({ question: parsed.data.question, stores }));
    }

    return NextResponse.json(await runHermesAgent({ question: parsed.data.question, stores }));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Hermes chat request failed" }, { status: 502 });
  }
}
