import "server-only";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";

interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
}

/**
 * Check API call quota for a tenant.
 * Uses database-based counting. Can be upgraded to Redis INCR counters later.
 */
export const checkApiCallQuota = async (
  organizationId: string,
  maxApiCallsPerDay: number
): Promise<QuotaCheckResult> => {
  // API call counting via Redis INCR is a Phase 2 optimization.
  // For now, fail open — quotas are enforced at the response/survey/contact level.
  return {
    allowed: true,
    current: 0,
    limit: maxApiCallsPerDay,
    remaining: maxApiCallsPerDay,
  };
};

/**
 * Check response quota for a tenant (monthly).
 * Queries database for current month's response count.
 */
export const checkResponseQuota = async (
  organizationId: string,
  maxResponsesPerMonth: number
): Promise<QuotaCheckResult> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const count = await prisma.response.count({
      where: {
        survey: {
          environment: {
            project: {
              organizationId,
            },
          },
        },
        createdAt: { gte: startOfMonth },
      },
    });

    const allowed = count < maxResponsesPerMonth;
    if (!allowed) {
      logger.warn(
        { tenantId: organizationId, current: count, limit: maxResponsesPerMonth },
        "Response quota exceeded"
      );
    }

    return {
      allowed,
      current: count,
      limit: maxResponsesPerMonth,
      remaining: Math.max(0, maxResponsesPerMonth - count),
    };
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to check response quota");
    return { allowed: true, current: 0, limit: maxResponsesPerMonth, remaining: maxResponsesPerMonth };
  }
};

/**
 * Check survey count quota for a tenant.
 */
export const checkSurveyQuota = async (
  organizationId: string,
  maxSurveys: number
): Promise<QuotaCheckResult> => {
  try {
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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [responseCount, surveyCount, contactCount] = await Promise.all([
      prisma.response.count({
        where: {
          survey: { environment: { project: { organizationId } } },
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.survey.count({
        where: { environment: { project: { organizationId } } },
      }),
      prisma.contact.count({
        where: { environment: { project: { organizationId } } },
      }),
    ]);

    return {
      todayApiCalls: 0, // Redis-based counting (Phase 2)
      currentMonthResponses: responseCount,
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
