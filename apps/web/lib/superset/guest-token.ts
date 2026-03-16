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
  // Try API first, then fall back to direct DB query (some Superset versions
  // return 404 on the GET embedded endpoint due to permission issues).
  let embeddedUuid: string | undefined;

  try {
    const embeddedInfo = (await supersetClient.apiRequest(
      "GET",
      `/api/v1/dashboard/${template.supersetDashboardId}/embedded`
    )) as { result?: { uuid?: string } };
    embeddedUuid = embeddedInfo?.result?.uuid;
  } catch {
    logger.warn(
      { dashboardId: template.supersetDashboardId },
      "Failed to get embedded UUID via API, falling back to DB query"
    );
  }

  if (!embeddedUuid) {
    // Fall back: query Superset DB directly for the embedded UUID
    const supersetDbUrl = process.env.SUPERSET_DB_URL;
    if (supersetDbUrl) {
      const { Client } = await import("pg");
      const pgClient = new Client({ connectionString: supersetDbUrl });
      try {
        await pgClient.connect();
        const result = await pgClient.query("SELECT uuid FROM embedded_dashboards WHERE dashboard_id = $1", [
          template.supersetDashboardId,
        ]);
        embeddedUuid = result.rows[0]?.uuid;
      } finally {
        await pgClient.end();
      }
    }
  }

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
