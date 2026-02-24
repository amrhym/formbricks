import { NextResponse } from "next/server";
import { getDiscoveryDocument } from "@/lib/oidc/provider";

export async function GET() {
  return NextResponse.json(getDiscoveryDocument(), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
