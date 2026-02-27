import { NextRequest } from "next/server";
import { prisma } from "@hivecfm/database";
import { responses } from "@/app/lib/api/response";
import { TSessionAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { hasUserEnvironmentAccess } from "@/lib/environment/auth";
import { mintGuestToken } from "@/lib/superset/guest-token";

export const GET = withV1ApiWrapper({
  handler: async ({
    req,
    authentication,
  }: {
    req: NextRequest;
    authentication: NonNullable<TSessionAuthentication>;
  }) => {
    const environmentId = req.headers.get("environmentId");

    if (!environmentId) {
      return {
        response: responses.badRequestResponse("environmentId is missing"),
      };
    }

    const canUserAccessEnvironment = await hasUserEnvironmentAccess(authentication.user.id, environmentId);
    if (!canUserAccessEnvironment) {
      return {
        response: responses.unauthorizedResponse(),
      };
    }

    const dashboardName = req.nextUrl.searchParams.get("dashboard") || "csat-overview";

    // Get the organizationId from the environment
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!environment?.project?.organization) {
      return {
        response: responses.badRequestResponse("Could not resolve organization for this environment"),
      };
    }

    const organizationId = environment.project.organization.id;

    const guestToken = await mintGuestToken(organizationId, dashboardName);

    return {
      response: responses.successResponse(guestToken),
    };
  },
});
