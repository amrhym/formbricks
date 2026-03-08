import "server-only";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { getLicense, isLicenseValid } from "./license";

interface LicenseCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
}

export const checkUserLimit = async (
  organizationId: string,
  maxUsers: number
): Promise<LicenseCheckResult> => {
  try {
    const count = await prisma.membership.count({
      where: { organizationId, accepted: true },
    });

    const allowed = count < maxUsers;
    if (!allowed) {
      logger.warn({ tenantId: organizationId, current: count, limit: maxUsers }, "User limit reached");
    }

    return {
      allowed,
      current: count,
      limit: maxUsers,
      remaining: Math.max(0, maxUsers - count),
    };
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to check user limit");
    return { allowed: false, current: 0, limit: maxUsers, remaining: 0 };
  }
};

export const checkCompletedResponseLimit = async (
  organizationId: string,
  maxCompletedResponses: number
): Promise<LicenseCheckResult> => {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const count = await prisma.response.count({
      where: {
        finished: true,
        survey: { environment: { project: { organizationId } } },
        createdAt: { gte: startOfYear },
      },
    });

    const allowed = count < maxCompletedResponses;
    if (!allowed) {
      logger.warn(
        { tenantId: organizationId, current: count, limit: maxCompletedResponses },
        "Completed response limit reached"
      );
    }

    return {
      allowed,
      current: count,
      limit: maxCompletedResponses,
      remaining: Math.max(0, maxCompletedResponses - count),
    };
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to check completed response limit");
    return {
      allowed: false,
      current: 0,
      limit: maxCompletedResponses,
      remaining: 0,
    };
  }
};

export const checkAddonAccess = async (
  organizationId: string,
  addon: "aiInsights" | "campaignManagement"
): Promise<boolean> => {
  try {
    const license = await getLicense(organizationId);
    if (!license) return false; // No license = no access to addons
    if (!isLicenseValid(license)) return false;

    if (addon === "aiInsights") return license.addonAiInsights;
    if (addon === "campaignManagement") return license.addonCampaignManagement;

    return false;
  } catch (error) {
    logger.error({ tenantId: organizationId, addon, error }, "Failed to check addon access");
    return false; // Fail closed
  }
};

export const checkLicenseValid = async (
  organizationId: string
): Promise<{ valid: boolean; reason?: string }> => {
  try {
    const license = await getLicense(organizationId);
    if (!license) return { valid: false, reason: "No license found for this organization" };

    if (!license.isActive) {
      return { valid: false, reason: "License is deactivated" };
    }

    const now = new Date();
    if (now < license.validFrom) {
      return { valid: false, reason: "License is not yet active" };
    }
    if (now > license.validUntil) {
      return { valid: false, reason: "License has expired" };
    }

    return { valid: true };
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to check license validity");
    return { valid: false, reason: "License validation failed" }; // Fail closed
  }
};
