import "server-only";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { TGuestToken } from "@hivecfm/types/tenant";
import { supersetClient } from "./client";

/**
 * Mint a guest token for embedded Superset dashboard access.
 * The RLS clause ensures the user only sees data from their organization.
 */
export const mintGuestToken = async (organizationId: string, dashboardName: string): Promise<TGuestToken> => {
  // Look up dashboard template by name
  const template = await prisma.dashboardTemplate.findUnique({
    where: { name: dashboardName },
  });

  if (!template) {
    throw new Error(`Dashboard template '${dashboardName}' not found`);
  }

  // Build RLS clause that scopes data to this organization
  const rlsClause = `"organizationId" = '${organizationId}'`;

  const { token, expiresAt } = await supersetClient.mintGuestToken(template.supersetDashboardId, rlsClause);

  logger.info(
    { tenantId: organizationId, dashboard: dashboardName },
    "Guest token minted for embedded dashboard"
  );

  return {
    guestToken: token,
    dashboardId: template.supersetDashboardId,
    expiresAt,
  };
};
