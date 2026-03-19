import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { type TOfflineLicensePayload, signLicenseToken } from "@hivecfm/license-crypto";
import { authOptions } from "@/lib/auth";
import { getOfflineOrg } from "@/lib/offline-store";

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
    const org = getOfflineOrg(orgId);

    if (!org) {
      return NextResponse.json({ error: "Offline organization not found" }, { status: 404 });
    }

    if (!org.license) {
      return NextResponse.json({ error: "No license found for this offline organization" }, { status: 404 });
    }

    const payload: TOfflineLicensePayload = {
      v: 1,
      iss: "hivelic",
      iat: Math.floor(Date.now() / 1000),
      jti: randomUUID(),
      orgId,
      orgName: org.name,
      licenseKey: org.license.licenseKey,
      maxCompletedResponses: org.license.maxCompletedResponses,
      maxUsers: org.license.maxUsers,
      addonAiInsights: org.license.addonAiInsights,
      addonCampaignManagement: org.license.addonCampaignManagement,
      validFrom: new Date(org.license.validFrom).toISOString(),
      validUntil: new Date(org.license.validUntil).toISOString(),
    };

    const pem = privateKeyPem.replace(/\\n/g, "\n");
    const token = signLicenseToken(payload, pem);

    return NextResponse.json({ token });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
