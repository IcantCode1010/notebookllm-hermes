import { NextRequest, NextResponse } from "next/server";
import { aircraftStores } from "@/lib/mock-data";
import { hasLocalRagflowConfig, resolveStoreDatasetId } from "@/lib/ragflow/adapter";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { documentId } = await context.params;

  if (!documentId) {
    return NextResponse.json({ error: "Missing source document id" }, { status: 400 });
  }

  const baseUrl = process.env.RAGFLOW_BASE_URL;
  const apiKey = process.env.RAGFLOW_API_KEY;

  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: "RAGFlow is not configured" }, { status: 404 });
  }

  for (const store of aircraftStores) {
    if (!hasLocalRagflowConfig(store)) {
      continue;
    }

    const datasetId = resolveStoreDatasetId(store);
    const response = await fetch(new URL(`/api/v1/datasets/${datasetId}/documents/${documentId}`, baseUrl), {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (response.ok) {
      return new NextResponse(response.body, {
        status: 200,
        headers: {
          "Content-Type": contentTypeFor(response.headers.get("Content-Type")),
          "Cache-Control": "private, max-age=300"
        }
      });
    }
  }

  return NextResponse.json({ error: "Source document not found" }, { status: 404 });
}

function contentTypeFor(upstreamContentType: string | null) {
  if (upstreamContentType?.toLowerCase().includes("pdf")) {
    return "application/pdf";
  }

  return "application/pdf";
}
