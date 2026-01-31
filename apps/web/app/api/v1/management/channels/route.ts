import { NextRequest } from "next/server";
import { ZChannelCreateInput } from "@hivecfm/types/channel";
import { DatabaseError, InvalidInputError } from "@hivecfm/types/errors";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { createChannel, getChannelsByEnvironmentId } from "@/lib/channel/service";
import { hasPermission } from "@/modules/organization/settings/api-keys/lib/utils";

export const GET = withV1ApiWrapper({
  handler: async ({ authentication }: { authentication: NonNullable<TApiKeyAuthentication> }) => {
    try {
      const environmentIds = authentication.environmentPermissions.map(
        (permission) => permission.environmentId
      );

      const allChannels: Awaited<ReturnType<typeof getChannelsByEnvironmentId>> = [];
      for (const environmentId of environmentIds) {
        const channels = await getChannelsByEnvironmentId(environmentId);
        allChannels.push(...channels);
      }

      return { response: responses.successResponse(allChannels) };
    } catch (error) {
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
});

export const POST = withV1ApiWrapper({
  handler: async ({
    req,
    authentication,
  }: {
    req: NextRequest;
    authentication: NonNullable<TApiKeyAuthentication>;
  }) => {
    try {
      const body = await req.json();

      const { environmentId, ...channelInput } = body;

      if (!environmentId) {
        return { response: responses.badRequestResponse("environmentId is required") };
      }

      if (!hasPermission(authentication.environmentPermissions, environmentId, "POST")) {
        return { response: responses.unauthorizedResponse() };
      }

      const parseResult = ZChannelCreateInput.safeParse(channelInput);
      if (!parseResult.success) {
        return {
          response: responses.badRequestResponse(
            "Validation failed",
            transformErrorToDetails(parseResult.error)
          ),
        };
      }

      const channel = await createChannel(environmentId, parseResult.data);

      return { response: responses.successResponse(channel) };
    } catch (error) {
      if (error instanceof InvalidInputError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "created",
  targetType: "channel" as any,
});
