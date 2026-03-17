"use server";

import { z } from "zod";
import { ZId } from "@hivecfm/types/common";
import { ZGenesysCloudCredential } from "@hivecfm/types/integration/genesys-cloud";
import { testConnection } from "@/lib/genesys-cloud/client";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { getOrganizationIdFromEnvironmentId, getProjectIdFromEnvironmentId } from "@/lib/utils/helper";

const ZTestGenesysCloudConnectionAction = z.object({
  environmentId: ZId,
  credentials: ZGenesysCloudCredential,
});

export const testGenesysCloudConnectionAction = authenticatedActionClient
  .schema(ZTestGenesysCloudConnectionAction)
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

    const result = await testConnection(parsedInput.credentials);
    return result;
  });
