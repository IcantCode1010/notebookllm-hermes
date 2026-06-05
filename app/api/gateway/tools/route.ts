import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  executeHermesGatewayTool,
  hermesGatewayManifest,
  isAuthorizedGatewayRequest
} from "@/lib/gateway/tools";

const toolRequestSchema = z.object({
  tool: z.string().min(1),
  arguments: z.unknown().default({})
});

export async function GET(request: NextRequest) {
  if (!isAuthorizedGatewayRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized gateway request" }, { status: 401 });
  }

  return NextResponse.json(hermesGatewayManifest);
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedGatewayRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized gateway request" }, { status: 401 });
  }

  const parsed = toolRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid gateway tool request" }, { status: 400 });
  }

  try {
    const result = await executeHermesGatewayTool(parsed.data.tool, parsed.data.arguments);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gateway tool execution failed" }, { status: 502 });
  }
}
