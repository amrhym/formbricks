"use server";

import { z } from "zod";
import { ZId } from "@hivecfm/types/common";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { getOrganizationIdFromEnvironmentId, getProjectIdFromEnvironmentId } from "@/lib/utils/helper";

const ZTestNovuConnectionAction = z.object({
  environmentId: ZId,
  apiKey: z.string().min(1),
  apiUrl: z.string().url(),
});

export const testNovuConnectionAction = authenticatedActionClient
  .schema(ZTestNovuConnectionAction)
  .action(async ({ ctx, parsedInput }) => {
    const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);

    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId,
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          minPermission: "readWrite",
          projectId: await getProjectIdFromEnvironmentId(parsedInput.environmentId),
        },
      ],
    });

    const response = await fetch(`${parsedInput.apiUrl}/v1/subscribers?limit=1`, {
      method: "GET",
      headers: {
        Authorization: `ApiKey ${parsedInput.apiKey}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Novu API returned ${response.status}: ${text}`);
    }

    return { success: true };
  });
