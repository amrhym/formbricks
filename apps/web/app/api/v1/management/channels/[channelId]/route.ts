import { NextRequest } from "next/server";
import { logger } from "@hivecfm/logger";
import { ZChannelUpdateInput } from "@hivecfm/types/channel";
import { DatabaseError, InvalidInputError, ResourceNotFoundError } from "@hivecfm/types/errors";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { deleteChannel, getChannel, updateChannel } from "@/lib/channel/service";
import { hasPermission } from "@/modules/organization/settings/api-keys/lib/utils";

export const GET = withV1ApiWrapper({
  handler: async ({
    props,
    authentication,
  }: {
    props: { params: Promise<{ channelId: string }> };
    authentication: NonNullable<TApiKeyAuthentication>;
  }) => {
    const params = await props.params;
    try {
      const channel = await getChannel(params.channelId);

      if (!hasPermission(authentication.environmentPermissions, channel.environmentId, "GET")) {
        return { response: responses.unauthorizedResponse() };
      }

      return { response: responses.successResponse(channel) };
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        return { response: responses.notFoundResponse("Channel", params.channelId) };
      }
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
});

export const PUT = withV1ApiWrapper({
  handler: async ({
    req,
    props,
    authentication,
  }: {
    req: NextRequest;
    props: { params: Promise<{ channelId: string }> };
    authentication: NonNullable<TApiKeyAuthentication>;
  }) => {
    const params = await props.params;
    try {
      // Verify channel exists and check permissions
      const existingChannel = await getChannel(params.channelId);

      if (!hasPermission(authentication.environmentPermissions, existingChannel.environmentId, "PUT")) {
        return { response: responses.unauthorizedResponse() };
      }

      const body = await req.json();
      const parseResult = ZChannelUpdateInput.safeParse(body);

      if (!parseResult.success) {
        return {
          response: responses.badRequestResponse(
            "Validation failed",
            transformErrorToDetails(parseResult.error)
          ),
        };
      }

      const channel = await updateChannel(params.channelId, parseResult.data);

      return { response: responses.successResponse(channel) };
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        return { response: responses.notFoundResponse("Channel", params.channelId) };
      }
      if (error instanceof InvalidInputError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "updated",
  targetType: "channel" as any,
});

export const DELETE = withV1ApiWrapper({
  handler: async ({
    props,
    authentication,
  }: {
    props: { params: Promise<{ channelId: string }> };
    authentication: NonNullable<TApiKeyAuthentication>;
  }) => {
    const params = await props.params;
    try {
      const existingChannel = await getChannel(params.channelId);

      if (!hasPermission(authentication.environmentPermissions, existingChannel.environmentId, "DELETE")) {
        return { response: responses.unauthorizedResponse() };
      }

      const channel = await deleteChannel(params.channelId);

      return { response: responses.successResponse(channel) };
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        return { response: responses.notFoundResponse("Channel", params.channelId) };
      }
      if (error instanceof InvalidInputError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "deleted",
  targetType: "channel" as any,
});
