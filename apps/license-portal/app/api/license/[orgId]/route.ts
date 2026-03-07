import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orgId } = await params;
    const body = await req.json();
    const license = await apiClient.createLicense(orgId, body);
    return NextResponse.json(license);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orgId } = await params;
    const body = await req.json();
    const license = await apiClient.updateLicense(orgId, body);
    return NextResponse.json(license);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
