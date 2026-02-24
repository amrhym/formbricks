import "server-only";
import { logger } from "@hivecfm/logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

/**
 * Simple Redis client for quota enforcement.
 * Uses fetch-based Redis commands via the application's Redis connection.
 */
async function getRedisClient() {
  // Use the cache package's Redis connection
  const { createCacheKey } = await import("@hivecfm/cache/cache-keys");
  const { getCache } = await import("@hivecfm/cache");
  return { createCacheKey, getCache };
}

interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
}

/**
 * Check and increment API call quota for a tenant.
 * Uses Redis INCR with daily TTL for O(1) per-request counting.
 */
export const checkApiCallQuota = async (
  organizationId: string,
  maxApiCallsPerDay: number
): Promise<QuotaCheckResult> => {
  try {
    const { default: Redis } = await import("ioredis");
    const redis = new Redis(REDIS_URL);

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const key = `tenant:${organizationId}:quota:apiCalls:${today}`;

    const current = await redis.incr(key);

    // Set TTL on first increment (expire at end of day)
    if (current === 1) {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const ttlSeconds = Math.ceil((endOfDay.getTime() - Date.now()) / 1000);
      await redis.expire(key, ttlSeconds);
    }

    await redis.quit();

    const allowed = current <= maxApiCallsPerDay;
    if (!allowed) {
      logger.warn({ tenantId: organizationId, current, limit: maxApiCallsPerDay }, "API call quota exceeded");
    }

    return {
      allowed,
      current,
      limit: maxApiCallsPerDay,
      remaining: Math.max(0, maxApiCallsPerDay - current),
    };
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to check API call quota");
    // Fail open — don't block requests if Redis is down
    return { allowed: true, current: 0, limit: maxApiCallsPerDay, remaining: maxApiCallsPerDay };
  }
};

/**
 * Check and increment response quota for a tenant.
 * Uses Redis INCR with monthly TTL.
 */
export const checkResponseQuota = async (
  organizationId: string,
  maxResponsesPerMonth: number
): Promise<QuotaCheckResult> => {
  try {
    const { default: Redis } = await import("ioredis");
    const redis = new Redis(REDIS_URL);

    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const key = `tenant:${organizationId}:quota:responses:${month}`;

    const current = await redis.incr(key);

    // Set TTL on first increment (expire at end of month)
    if (current === 1) {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const ttlSeconds = Math.ceil((endOfMonth.getTime() - Date.now()) / 1000);
      await redis.expire(key, ttlSeconds);
    }

    await redis.quit();

    const allowed = current <= maxResponsesPerMonth;
    if (!allowed) {
      logger.warn(
        { tenantId: organizationId, current, limit: maxResponsesPerMonth },
        "Response quota exceeded"
      );
    }

    return {
      allowed,
      current,
      limit: maxResponsesPerMonth,
      remaining: Math.max(0, maxResponsesPerMonth - current),
    };
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to check response quota");
    return { allowed: true, current: 0, limit: maxResponsesPerMonth, remaining: maxResponsesPerMonth };
  }
};

/**
 * Check survey count quota for a tenant.
 * Queries database for current count (not Redis-cached since surveys change infrequently).
 */
export const checkSurveyQuota = async (
  organizationId: string,
  maxSurveys: number
): Promise<QuotaCheckResult> => {
  try {
    const { prisma } = await import("@hivecfm/database");

    const count = await prisma.survey.count({
      where: {
        environment: {
          project: {
            organizationId,
          },
        },
      },
    });

    const allowed = count < maxSurveys;
    return {
      allowed,
      current: count,
      limit: maxSurveys,
      remaining: Math.max(0, maxSurveys - count),
    };
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to check survey quota");
    return { allowed: true, current: 0, limit: maxSurveys, remaining: maxSurveys };
  }
};

/**
 * Check contact count quota for a tenant.
 */
export const checkContactQuota = async (
  organizationId: string,
  maxContacts: number
): Promise<QuotaCheckResult> => {
  try {
    const { prisma } = await import("@hivecfm/database");

    const count = await prisma.contact.count({
      where: {
        environment: {
          project: {
            organizationId,
          },
        },
      },
    });

    const allowed = count < maxContacts;
    return {
      allowed,
      current: count,
      limit: maxContacts,
      remaining: Math.max(0, maxContacts - count),
    };
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to check contact quota");
    return { allowed: true, current: 0, limit: maxContacts, remaining: maxContacts };
  }
};

/**
 * Get current usage for a tenant (for quota status display).
 */
export const getQuotaUsage = async (organizationId: string) => {
  try {
    const { default: Redis } = await import("ioredis");
    const redis = new Redis(REDIS_URL);

    const today = new Date().toISOString().split("T")[0];
    const month = new Date().toISOString().slice(0, 7);

    const [apiCalls, responses] = await Promise.all([
      redis.get(`tenant:${organizationId}:quota:apiCalls:${today}`),
      redis.get(`tenant:${organizationId}:quota:responses:${month}`),
    ]);

    await redis.quit();

    const { prisma } = await import("@hivecfm/database");
    const [surveyCount, contactCount] = await Promise.all([
      prisma.survey.count({
        where: { environment: { project: { organizationId } } },
      }),
      prisma.contact.count({
        where: { environment: { project: { organizationId } } },
      }),
    ]);

    return {
      todayApiCalls: parseInt(apiCalls || "0", 10),
      currentMonthResponses: parseInt(responses || "0", 10),
      currentSurveys: surveyCount,
      currentContacts: contactCount,
    };
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to get quota usage");
    return {
      todayApiCalls: 0,
      currentMonthResponses: 0,
      currentSurveys: 0,
      currentContacts: 0,
    };
  }
};
