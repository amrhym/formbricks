import { cache as reactCache } from "react";
import { prisma } from "@hivecfm/database";

/**
 * Check if AI features are enabled for an environment.
 * Looks up Organization.isAIEnabled via Environment → Project → Organization chain.
 */
export const isAIEnabledForEnvironment = reactCache(async (environmentId: string): Promise<boolean> => {
  try {
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId },
      select: {
        project: {
          select: {
            organization: {
              select: { isAIEnabled: true },
            },
          },
        },
      },
    });

    return environment?.project?.organization?.isAIEnabled ?? false;
  } catch {
    return false;
  }
});

/**
 * Check if Campaign Management addon is enabled for an environment.
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
                id: true,
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
