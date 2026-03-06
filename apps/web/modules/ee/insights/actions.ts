"use server";

import { z } from "zod";
import { ZId } from "@hivecfm/types/common";
import { searchFeedbackSemantic } from "@/lib/hivecfm-hub/service";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { getOrganizationIdFromEnvironmentId, getProjectIdFromEnvironmentId } from "@/lib/utils/helper";

const ZSemanticSearchAction = z.object({
  environmentId: ZId,
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).optional(),
});

export const semanticSearchAction = authenticatedActionClient
  .schema(ZSemanticSearchAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromEnvironmentId(parsedInput.environmentId),
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          minPermission: "read",
          projectId: await getProjectIdFromEnvironmentId(parsedInput.environmentId),
        },
      ],
    });

    return searchFeedbackSemantic({
      query: parsedInput.query,
      tenantId: parsedInput.environmentId,
      limit: parsedInput.limit,
      minScore: 0.3,
    });
  });
