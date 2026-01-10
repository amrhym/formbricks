import "server-only";
import { HttpsProxyAgent } from "https-proxy-agent";
import fetch from "node-fetch";
import { cache as reactCache } from "react";
import { z } from "zod";
import { createCacheKey } from "@hivecfm/cache";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { cache } from "@/lib/cache";
import { E2E_TESTING } from "@/lib/constants";
import { env } from "@/lib/env";
import { hashString } from "@/lib/hash-string";
import { getInstanceId } from "@/lib/instance";
import {
  TEnterpriseLicenseDetails,
  TEnterpriseLicenseFeatures,
} from "@/modules/ee/license-check/types/enterprise-license";

// =============================================================================
// HiveCFM Enterprise Unlock
// =============================================================================
// Version: Tested against Formbricks v3.x (January 2026)
// Purpose: Bypass license validation to enable all enterprise features
//
// This file has been significantly simplified for HiveCFM. The original
// Formbricks license validation logic has been removed since we always
// return an active enterprise license. See the original file in upstream
// Formbricks for the full implementation if needed for reference.
// =============================================================================

// Configuration - kept for fetchLicense compatibility
const CONFIG = {
  CACHE: {
    FETCH_LICENSE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
  },
  API: {
    ENDPOINT:
      env.ENVIRONMENT === "staging"
        ? "https://staging.ee.formbricks.com/api/licenses/check"
        : "https://ee.formbricks.com/api/licenses/check",
    TIMEOUT_MS: 5000,
  },
} as const;

// Types
type FallbackLevel = "live" | "cached" | "grace" | "default";

// Validation schemas
const LicenseFeaturesSchema = z.object({
  isMultiOrgEnabled: z.boolean(),
  projects: z.number().nullable(),
  twoFactorAuth: z.boolean(),
  sso: z.boolean(),
  whitelabel: z.boolean(),
  removeBranding: z.boolean(),
  contacts: z.boolean(),
  ai: z.boolean(),
  saml: z.boolean(),
  spamProtection: z.boolean(),
  auditLogs: z.boolean(),
  multiLanguageSurveys: z.boolean(),
  accessControl: z.boolean(),
  quotas: z.boolean(),
});

const LicenseDetailsSchema = z.object({
  status: z.enum(["active", "expired"]),
  features: LicenseFeaturesSchema,
});

// Error types
class LicenseError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "LicenseError";
  }
}

class LicenseApiError extends LicenseError {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message, "API_ERROR");
    this.name = "LicenseApiError";
  }
}

// Cache keys using enterprise-grade hierarchical patterns
const getCacheIdentifier = () => {
  if (typeof window !== "undefined") {
    return "browser"; // Browser environment
  }
  if (!env.ENTERPRISE_LICENSE_KEY) {
    return "no-license"; // No license key provided
  }
  return hashString(env.ENTERPRISE_LICENSE_KEY); // Valid license key
};

export const getCacheKeys = () => {
  const identifier = getCacheIdentifier();
  return {
    FETCH_LICENSE_CACHE_KEY: createCacheKey.license.status(identifier),
    PREVIOUS_RESULT_CACHE_KEY: createCacheKey.license.previous_result(identifier),
  };
};

// Helper functions
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const validateLicenseDetails = (data: unknown): TEnterpriseLicenseDetails => {
  return LicenseDetailsSchema.parse(data);
};

const trackApiError = (error: LicenseApiError) => {
  logger.error(
    {
      status: error.status,
      code: error.code,
      timestamp: new Date().toISOString(),
    },
    `License API error: ${error.message}`
  );
};

// API functions - kept for compatibility but not used in HiveCFM
const fetchLicenseFromServerInternal = async (retryCount = 0): Promise<TEnterpriseLicenseDetails | null> => {
  if (!env.ENTERPRISE_LICENSE_KEY) return null;

  // Skip license checks during build time
  // eslint-disable-next-line turbo/no-undeclared-env-vars -- NEXT_PHASE is a next.js env variable
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return null;
  }

  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

    const [instanceId, responseCount] = await Promise.all([
      E2E_TESTING ? null : getInstanceId(),
      prisma.response.count({
        where: {
          createdAt: {
            gte: startOfYear,
            lt: startOfNextYear,
          },
        },
      }),
    ]);

    if (!E2E_TESTING && !instanceId) return null;

    const proxyUrl = env.HTTPS_PROXY ?? env.HTTP_PROXY;
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT_MS);

    const payload: Record<string, unknown> = {
      licenseKey: env.ENTERPRISE_LICENSE_KEY,
      usage: { responseCount },
    };

    if (instanceId) {
      payload.instanceId = instanceId;
    }

    const res = await fetch(CONFIG.API.ENDPOINT, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      agent,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const responseJson = (await res.json()) as { data: unknown };
      return validateLicenseDetails(responseJson.data);
    }

    const error = new LicenseApiError(`License check API responded with status: ${res.status}`, res.status);
    trackApiError(error);

    if (retryCount < CONFIG.CACHE.MAX_RETRIES && [429, 502, 503, 504].includes(res.status)) {
      await sleep(CONFIG.CACHE.RETRY_DELAY_MS * Math.pow(2, retryCount));
      return fetchLicenseFromServerInternal(retryCount + 1);
    }

    return null;
  } catch (error) {
    if (error instanceof LicenseApiError) {
      throw error;
    }
    logger.error(error, "Error while fetching license from server");
    return null;
  }
};

export const fetchLicense = async (): Promise<TEnterpriseLicenseDetails | null> => {
  if (!env.ENTERPRISE_LICENSE_KEY) return null;

  // eslint-disable-next-line turbo/no-undeclared-env-vars -- NEXT_PHASE is a next.js env variable
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return null;
  }

  return await cache.withCache(
    async () => {
      return await fetchLicenseFromServerInternal();
    },
    getCacheKeys().FETCH_LICENSE_CACHE_KEY,
    CONFIG.CACHE.FETCH_LICENSE_TTL_MS
  );
};

// HiveCFM Enterprise Features - All features enabled
const HIVECFM_ENTERPRISE_FEATURES: TEnterpriseLicenseFeatures = {
  isMultiOrgEnabled: true,
  projects: null, // unlimited
  twoFactorAuth: true,
  sso: true,
  whitelabel: true,
  removeBranding: true,
  contacts: true,
  ai: true,
  saml: true,
  spamProtection: true,
  auditLogs: true,
  multiLanguageSurveys: true,
  accessControl: true,
  quotas: true,
};

// HiveCFM: Always return active enterprise license with all features
export const getEnterpriseLicense = reactCache(
  async (): Promise<{
    active: boolean;
    features: TEnterpriseLicenseFeatures | null;
    lastChecked: Date;
    isPendingDowngrade: boolean;
    fallbackLevel: FallbackLevel;
  }> => {
    return {
      active: true,
      features: HIVECFM_ENTERPRISE_FEATURES,
      lastChecked: new Date(),
      isPendingDowngrade: false,
      fallbackLevel: "live" as const,
    };
  }
);

export const getLicenseFeatures = async (): Promise<TEnterpriseLicenseFeatures | null> => {
  try {
    const licenseState = await getEnterpriseLicense();
    return licenseState.active ? licenseState.features : null;
  } catch (e) {
    logger.error(e, "Error getting license features");
    return null;
  }
};

// All permission checking functions and their helpers have been moved to utils.ts
