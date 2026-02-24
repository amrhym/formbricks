import { NextRequest } from "next/server";
import { DatabaseError } from "@hivecfm/types/errors";
import { responses } from "@/app/lib/api/response";
import { TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { mintGuestToken } from "@/lib/superset/guest-token";

export const GET = withV1ApiWrapper({
  handler: async ({
    req,
    authentication,
  }: {
    req: NextRequest;
    authentication: NonNullable<TApiKeyAuthentication>;
  }) => {
    try {
      const dashboardName = req.nextUrl.searchParams.get("dashboard") || "csat-overview";

      const guestToken = await mintGuestToken(authentication.organizationId, dashboardName);

      return {
        response: responses.successResponse(guestToken),
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
});
