import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@hivecfm/database";
import {
  EMBEDDED_PRIVATE_KEY,
  EMBEDDED_PUBLIC_KEY,
  LicenseTokenError,
  signLicenseData,
  verifyLicenseToken,
} from "@hivecfm/license-crypto";
import { logger } from "@hivecfm/logger";
import { DatabaseError, ResourceNotFoundError } from "@hivecfm/types/errors";
import { TTenantLicense } from "@hivecfm/types/tenant";

function getPrivateKey(): string {
  const raw = process.env.HIVECFM_LICENSE_PRIVATE_KEY || process.env.HIVELIC_SIGNING_PRIVATE_KEY;
  if (raw) return raw.replace(/\\n/g, "\n").trim();
  return EMBEDDED_PRIVATE_KEY;
}

function computeLicenseSignature(payload: {
  orgId: string;
  licenseKey: string;
  maxCompletedResponses: number;
  maxUsers: number;
  addonAiInsights: boolean;
  addonCampaignManagement: boolean;
  validFrom: string;
  validUntil: string;
}): string {
  const privateKey = getPrivateKey();

  return signLicenseData(
    {
      organizationId: payload.orgId,
      licenseKey: payload.licenseKey,
      maxCompletedResponses: payload.maxCompletedResponses,
      maxUsers: payload.maxUsers,
      addonAiInsights: payload.addonAiInsights,
      addonCampaignManagement: payload.addonCampaignManagement,
      validFrom: new Date(payload.validFrom).toISOString(),
      validUntil: new Date(payload.validUntil).toISOString(),
      isActive: true,
    },
    privateKey
  );
}

function getPublicKeys(): string[] {
  const raw = process.env.HIVECFM_LICENSE_PUBLIC_KEY;
  if (raw) {
    return raw
      .split("|")
      .map((k) => k.replace(/\\n/g, "\n").trim())
      .filter(Boolean);
  }
  return [EMBEDDED_PUBLIC_KEY];
}

export async function activateOfflineLicense(token: string): Promise<TTenantLicense> {
  const publicKeys = getPublicKeys();

  const payload = verifyLicenseToken(token, publicKeys);

  const validUntil = new Date(payload.validUntil);
  if (validUntil < new Date()) {
    throw new Error("License token has expired (validUntil is in the past).");
  }

  const org = await prisma.organization.findUnique({ where: { id: payload.orgId } });
  if (!org) {
    throw new ResourceNotFoundError("Organization", payload.orgId);
  }

  try {
    // Compute signature so the license passes integrity checks
    const signature = computeLicenseSignature(payload);

    const licenseData = {
      licenseKey: payload.licenseKey,
      maxCompletedResponses: payload.maxCompletedResponses,
      maxUsers: payload.maxUsers,
      addonAiInsights: payload.addonAiInsights,
      addonCampaignManagement: payload.addonCampaignManagement,
      validFrom: new Date(payload.validFrom),
      validUntil,
      isActive: true,
      licenseSignature: signature,
    };

    const license = await prisma.tenantLicense.upsert({
      where: { organizationId: payload.orgId },
      create: { organizationId: payload.orgId, ...licenseData },
      update: licenseData,
    });

    logger.info(
      { organizationId: payload.orgId, licenseKey: payload.licenseKey },
      "Offline license activated"
    );
    return license as TTenantLicense;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
}

export async function tryAutoActivateFromEnv(): Promise<void> {
  const token = process.env.HIVECFM_OFFLINE_LICENSE_TOKEN;
  if (!token) return;

  try {
    const license = await activateOfflineLicense(token);
    logger.info(
      { organizationId: license.organizationId, licenseKey: license.licenseKey },
      "Auto-activated offline license from HIVECFM_OFFLINE_LICENSE_TOKEN"
    );
  } catch (error) {
    if (error instanceof LicenseTokenError) {
      logger.error({ code: error.code, message: error.message }, "Failed to auto-activate offline license");
    } else {
      logger.error({ error }, "Failed to auto-activate offline license");
    }
  }
}
