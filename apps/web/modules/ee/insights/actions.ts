"use server";

import { z } from "zod";
import { ZId } from "@hivecfm/types/common";
import { getSimilarFeedback, searchFeedbackSemantic } from "@/lib/hivecfm-hub/service";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { getOrganizationIdFromEnvironmentId, getProjectIdFromEnvironmentId } from "@/lib/utils/helper";

const ZSemanticSearchAction = z.object({
  environmentId: ZId,
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).optional(),
  sourceId: z.string().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  cursor: z.string().optional(),
});

async function checkInsightsAccess(userId: string, environmentId: string) {
  await checkAuthorizationUpdated({
    userId,
    organizationId: await getOrganizationIdFromEnvironmentId(environmentId),
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

    return searchFeedbackSemantic({
      query: parsedInput.query,
      tenantId: parsedInput.environmentId,
      limit: parsedInput.limit,
      minScore: 0.3,
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

    return getSimilarFeedback({
      recordId: parsedInput.feedbackRecordId,
      tenantId: parsedInput.environmentId,
      limit: parsedInput.limit ?? 10,
      cursor: parsedInput.cursor,
    });
  });
