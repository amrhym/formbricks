import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/oidc/provider";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = verifyJwt(token);
  if (!payload) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  return NextResponse.json({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    organization_id: payload.organization_id,
    role: payload.role,
  });
}
