import { NextResponse } from "next/server";
import { aircraftStores } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({ stores: aircraftStores.filter((store) => store.status === "ACTIVE") });
}
