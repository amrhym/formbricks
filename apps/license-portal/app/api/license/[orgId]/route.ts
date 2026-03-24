import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { type LicenseSignableData, signLicenseData } from "@hivecfm/license-crypto";
import { apiClient } from "@/lib/api-client";
import { authOptions } from "@/lib/auth";

function getPrivateKey(): string | null {
  return process.env.HIVECFM_LICENSE_PRIVATE_KEY || null;
}

function signLicense(orgId: string, license: any): string | undefined {
  const privateKey = getPrivateKey();
  if (!privateKey) return undefined;

  const data: LicenseSignableData = {
    organizationId: orgId,
    licenseKey: license.licenseKey,
    maxCompletedResponses: license.maxCompletedResponses,
    maxUsers: license.maxUsers,
    addonAiInsights: license.addonAiInsights,
    addonCampaignManagement: license.addonCampaignManagement,
    validFrom: new Date(license.validFrom).toISOString(),
    validUntil: new Date(license.validUntil).toISOString(),
    isActive: license.isActive ?? true,
  };

  return signLicenseData(data, privateKey);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orgId } = await params;
    const body = await req.json();
    const license = await apiClient.createLicense(orgId, body);

    // Sign the license and update with signature
    const signature = signLicense(orgId, license);
    if (signature) {
      await apiClient.updateLicense(orgId, { licenseSignature: signature });
    }

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

    // Re-sign after update
    const signature = signLicense(orgId, license);
    if (signature) {
      await apiClient.updateLicense(orgId, { licenseSignature: signature });
    }

    return NextResponse.json(license);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
