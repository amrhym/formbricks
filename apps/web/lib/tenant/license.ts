import "server-only";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { prisma } from "@hivecfm/database";
import { EMBEDDED_PRIVATE_KEY, signLicenseData } from "@hivecfm/license-crypto";
import { logger } from "@hivecfm/logger";
import { ZId } from "@hivecfm/types/common";
import { DatabaseError, ResourceNotFoundError } from "@hivecfm/types/errors";
import {
  TTenantLicense,
  TTenantLicenseCreate,
  TTenantLicenseUpdate,
  ZTenantLicenseCreate,
  ZTenantLicenseUpdate,
} from "@hivecfm/types/tenant";
import { validateInputs } from "@/lib/utils/validate";

function getSigningKey(): string {
  const raw = process.env.HIVECFM_LICENSE_PRIVATE_KEY || process.env.HIVELIC_SIGNING_PRIVATE_KEY;
  if (raw) return raw.replace(/\\n/g, "\n").trim();
  return EMBEDDED_PRIVATE_KEY;
}

const tenantLicenseSelect: Prisma.TenantLicenseSelect = {
  id: true,
  organizationId: true,
  licenseKey: true,
  maxCompletedResponses: true,
  maxUsers: true,
  addonAiInsights: true,
  addonCampaignManagement: true,
  validFrom: true,
  validUntil: true,
  isActive: true,
  licenseSignature: true,
  createdAt: true,
  updatedAt: true,
};

export const generateLicenseKey = (): string => {
  const bytes = crypto.randomBytes(16);
  const hex = bytes.toString("hex").toUpperCase();
  const parts = [hex.slice(0, 4), hex.slice(4, 8), hex.slice(8, 12), hex.slice(12, 16)];
  return `HCFM-${parts.join("-")}`;
};

export const createLicense = async (
  organizationId: string,
  input: TTenantLicenseCreate
): Promise<TTenantLicense> => {
  validateInputs([organizationId, ZId], [input, ZTenantLicenseCreate]);

  try {
    const licenseKey = generateLicenseKey();
    const validFrom = input.validFrom ?? new Date();

    // Sign the license data so it passes integrity checks
    const signature = signLicenseData(
      {
        organizationId,
        licenseKey,
        maxCompletedResponses: input.maxCompletedResponses,
        maxUsers: input.maxUsers,
        addonAiInsights: input.addonAiInsights,
        addonCampaignManagement: input.addonCampaignManagement,
        validFrom: validFrom.toISOString(),
        validUntil: input.validUntil.toISOString(),
        isActive: true,
      },
      getSigningKey()
    );

    const license = await prisma.tenantLicense.create({
      data: {
        organizationId,
        licenseKey,
        maxCompletedResponses: input.maxCompletedResponses,
        maxUsers: input.maxUsers,
        addonAiInsights: input.addonAiInsights,
        addonCampaignManagement: input.addonCampaignManagement,
        validFrom,
        validUntil: input.validUntil,
        licenseSignature: signature,
      },
      select: tenantLicenseSelect,
    });

    logger.info({ organizationId }, "Tenant license created (signed)");
    return license as TTenantLicense;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

export const getLicense = async (organizationId: string): Promise<TTenantLicense | null> => {
  validateInputs([organizationId, ZId]);

  try {
    return await prisma.tenantLicense.findUnique({
      where: { organizationId },
      select: tenantLicenseSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

export const getLicenseByKey = async (licenseKey: string): Promise<TTenantLicense | null> => {
  try {
    return await prisma.tenantLicense.findUnique({
      where: { licenseKey },
      select: tenantLicenseSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

export const updateLicense = async (
  organizationId: string,
  data: TTenantLicenseUpdate
): Promise<TTenantLicense> => {
  validateInputs([organizationId, ZId], [data, ZTenantLicenseUpdate]);

  try {
    const license = await prisma.tenantLicense.update({
      where: { organizationId },
      data,
      select: tenantLicenseSelect,
    });

    logger.info({ organizationId }, "Tenant license updated");
    return license as TTenantLicense;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new ResourceNotFoundError("TenantLicense", organizationId);
      }
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

export const activateLicense = async (
  organizationId: string,
  licenseKey: string
): Promise<TTenantLicense> => {
  validateInputs([organizationId, ZId]);

  try {
    const license = await prisma.tenantLicense.findUnique({
      where: { licenseKey },
      select: tenantLicenseSelect,
    });

    if (!license) {
      throw new ResourceNotFoundError("TenantLicense", licenseKey);
    }

    // Key must belong to the same organization or be unlinked
    if (license.organizationId !== organizationId) {
      throw new Error("License key does not belong to this organization");
    }

    // Activate the license
    const updated = await prisma.tenantLicense.update({
      where: { licenseKey },
      data: { isActive: true },
      select: tenantLicenseSelect,
    });

    logger.info({ organizationId, licenseKey }, "Tenant license activated");
    return updated as TTenantLicense;
  } catch (error) {
    if (error instanceof ResourceNotFoundError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

export const isLicenseValid = (license: TTenantLicense): boolean => {
  if (!license.isActive) return false;
  const now = new Date();
  return license.validFrom <= now && now <= license.validUntil;
};

export const getLicenseStatus = async (organizationId: string) => {
  validateInputs([organizationId, ZId]);

  const license = await getLicense(organizationId);
  if (!license) return null;

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [completedResponseCount, userCount] = await Promise.all([
    prisma.response.count({
      where: {
        finished: true,
        survey: { environment: { project: { organizationId } } },
        createdAt: { gte: startOfYear },
      },
    }),
    prisma.membership.count({
      where: { organizationId, accepted: true },
    }),
  ]);

  return {
    ...license,
    valid: isLicenseValid(license),
    usage: {
      completedResponsesThisYear: completedResponseCount,
      currentUsers: userCount,
    },
  };
};
