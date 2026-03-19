import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { deleteOfflineOrg, getOfflineOrg, updateOfflineOrgLicense } from "@/lib/offline-store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orgId } = await params;
    const org = getOfflineOrg(orgId);
    if (!org) {
      return NextResponse.json({ error: "Offline organization not found" }, { status: 404 });
    }
    return NextResponse.json(org);
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

    const org = updateOfflineOrgLicense(orgId, {
      maxUsers: body.maxUsers,
      maxCompletedResponses: body.maxCompletedResponses,
      addonAiInsights: body.addonAiInsights ?? false,
      addonCampaignManagement: body.addonCampaignManagement ?? false,
      validFrom: body.validFrom || new Date().toISOString(),
      validUntil: body.validUntil,
      isActive: body.isActive ?? true,
    });

    return NextResponse.json(org);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orgId } = await params;
    deleteOfflineOrg(orgId);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
