import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { type TOfflineLicensePayload, signLicenseToken } from "@hivecfm/license-crypto";
import { apiClient } from "@/lib/api-client";
import { authOptions } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const privateKeyPem = process.env.HIVELIC_SIGNING_PRIVATE_KEY;
  if (!privateKeyPem) {
    return NextResponse.json(
      { error: "Signing key not configured. Set HIVELIC_SIGNING_PRIVATE_KEY." },
      { status: 500 }
    );
  }

  try {
    const { orgId } = await params;

    const [tenantDetail, license] = await Promise.all([
      apiClient.getTenant(orgId),
      apiClient.getLicenseStatus(orgId),
    ]);

    if (!license) {
      return NextResponse.json({ error: "No license found for this tenant" }, { status: 404 });
    }

    const org = tenantDetail.organization || (tenantDetail as any);

    const payload: TOfflineLicensePayload = {
      v: 1,
      iss: "hivelic",
      iat: Math.floor(Date.now() / 1000),
      jti: randomUUID(),
      orgId,
      orgName: org.name || orgId,
      licenseKey: license.licenseKey,
      maxCompletedResponses: license.maxCompletedResponses,
      maxUsers: license.maxUsers,
      addonAiInsights: license.addonAiInsights,
      addonCampaignManagement: license.addonCampaignManagement,
      validFrom: new Date(license.validFrom).toISOString(),
      validUntil: new Date(license.validUntil).toISOString(),
    };

    const pem = privateKeyPem.replace(/\\n/g, "\n");
    const token = signLicenseToken(payload, pem);

    return NextResponse.json({ token });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
