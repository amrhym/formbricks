import { NextRequest } from "next/server";
import { prisma } from "@hivecfm/database";
import { responses } from "@/app/lib/api/response";
import { TSessionAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { hasUserEnvironmentAccess } from "@/lib/environment/auth";

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

    const dashboards = await prisma.dashboardTemplate.findMany({
      where: { isDefault: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        supersetDashboardId: true,
      },
    });

    return {
      response: responses.successResponse(dashboards),
    };
  },
});
