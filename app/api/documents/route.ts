import { NextRequest, NextResponse } from "next/server";
import { sourceDocuments } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("storeId");
  const documents = sourceDocuments.filter((document) => {
    return document.status === "PUBLISHED" && (!storeId || document.storeId === storeId);
  });

  return NextResponse.json({ documents });
}
