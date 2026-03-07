"use server";

import { z } from "zod";
import { ZId } from "@hivecfm/types/common";
import { getSimilarFeedback, searchFeedbackSemantic } from "@/lib/hivecfm-hub/service";
import { checkAddonAccess } from "@/lib/tenant/license-enforcement";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { getOrganizationIdFromEnvironmentId, getProjectIdFromEnvironmentId } from "@/lib/utils/helper";

const ZSemanticSearchAction = z.object({
  environmentId: ZId,
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).optional(),
  minScore: z.number().min(0).max(1).optional(),
  sourceId: z.string().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  cursor: z.string().optional(),
});

async function checkInsightsAccess(userId: string, environmentId: string) {
  const organizationId = await getOrganizationIdFromEnvironmentId(environmentId);

  // Check license addon access
  const hasAddonAccess = await checkAddonAccess(organizationId, "aiInsights");
  if (!hasAddonAccess) {
    throw new Error("AI Insights addon is not enabled for this organization");
  }

  await checkAuthorizationUpdated({
    userId,
    organizationId,
    access: [
      {
        type: "organization",
        roles: ["owner", "manager"],
      },
      {
        type: "projectTeam",
        minPermission: "read",
        projectId: await getProjectIdFromEnvironmentId(environmentId),
      },
    ],
  });
}

export const semanticSearchAction = authenticatedActionClient
  .schema(ZSemanticSearchAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkInsightsAccess(ctx.user.id, parsedInput.environmentId);

    const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);
    return searchFeedbackSemantic({
      query: parsedInput.query,
      tenantId: organizationId,
      limit: parsedInput.limit,
      minScore: parsedInput.minScore ?? 0.3,
      sourceId: parsedInput.sourceId,
      since: parsedInput.since,
      until: parsedInput.until,
      cursor: parsedInput.cursor,
    });
  });

const ZFindSimilarAction = z.object({
  environmentId: ZId,
  feedbackRecordId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

export const findSimilarAction = authenticatedActionClient
  .schema(ZFindSimilarAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkInsightsAccess(ctx.user.id, parsedInput.environmentId);

    const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);
    return getSimilarFeedback({
      recordId: parsedInput.feedbackRecordId,
      tenantId: organizationId,
      limit: parsedInput.limit ?? 10,
      cursor: parsedInput.cursor,
    });
  });
