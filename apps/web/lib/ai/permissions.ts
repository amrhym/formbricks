import { cache as reactCache } from "react";
import { prisma } from "@hivecfm/database";

/**
 * Check if AI features are enabled for an environment.
 * Reads directly from TenantLicense.addonAiInsights via Environment → Project → Organization chain.
 */
export const isAIEnabledForEnvironment = reactCache(async (environmentId: string): Promise<boolean> => {
  try {
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId },
      select: {
        project: {
          select: {
            organization: {
              select: {
                tenantLicense: {
                  select: { addonAiInsights: true },
                },
              },
            },
          },
        },
      },
    });

    return environment?.project?.organization?.tenantLicense?.addonAiInsights ?? false;
  } catch {
    return false;
  }
});

/**
 * Check if Campaign Management addon is enabled for an environment.
 * Reads directly from TenantLicense.addonCampaignManagement.
 */
export const isCampaignEnabledForEnvironment = reactCache(async (environmentId: string): Promise<boolean> => {
  try {
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId },
      select: {
        project: {
          select: {
            organization: {
              select: {
                tenantLicense: {
                  select: { addonCampaignManagement: true },
                },
              },
            },
          },
        },
      },
    });

    return environment?.project?.organization?.tenantLicense?.addonCampaignManagement ?? false;
  } catch {
    return false;
  }
});
