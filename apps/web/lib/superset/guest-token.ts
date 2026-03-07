import "server-only";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { TGuestToken } from "@hivecfm/types/tenant";
import { supersetClient } from "./client";

/**
 * Mint a guest token for embedded Superset dashboard access.
 * The RLS clause ensures the user only sees data from their organization.
 *
 * The template stores the integer dashboard ID (used for iframe URL).
 * We resolve the embedded UUID via the Superset API for token minting.
 */
export const mintGuestToken = async (organizationId: string, dashboardName: string): Promise<TGuestToken> => {
  // Look up dashboard template by name
  const template = await prisma.dashboardTemplate.findUnique({
    where: { name: dashboardName },
  });

  if (!template) {
    throw new Error(`Dashboard template '${dashboardName}' not found`);
  }

  // Resolve the embedded dashboard UUID from the integer dashboard ID.
  // Superset's guest_token API requires the embedded UUID, not the integer ID.
  const embeddedInfo = (await supersetClient.apiRequest(
    "GET",
    `/api/v1/dashboard/${template.supersetDashboardId}/embedded`
  )) as { result?: { uuid?: string } };

  const embeddedUuid = embeddedInfo?.result?.uuid;
  if (!embeddedUuid) {
    throw new Error(`Dashboard ${template.supersetDashboardId} is not configured for embedding in Superset`);
  }

  // Build RLS clause that scopes data to this organization
  const rlsClause = `"organizationId" = '${organizationId}'`;

  const { token, expiresAt } = await supersetClient.mintGuestToken(embeddedUuid, rlsClause);

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
