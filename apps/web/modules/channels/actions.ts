"use server";

import { z } from "zod";
import { ZChannelCreateInput, ZChannelUpdateInput } from "@hivecfm/types/channel";
import { ZId } from "@hivecfm/types/common";
import { createChannel, deleteChannel, updateChannel } from "@/lib/channel/service";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { AuthenticatedActionClientCtx } from "@/lib/utils/action-client/types/context";
import { getOrganizationIdFromChannelId, getOrganizationIdFromEnvironmentId } from "@/lib/utils/helper";
import { withAuditLogging } from "@/modules/ee/audit-logs/lib/handler";

const ZCreateChannelAction = z.object({
  environmentId: ZId,
  channelData: ZChannelCreateInput,
});

export const createChannelAction = authenticatedActionClient.schema(ZCreateChannelAction).action(
  withAuditLogging(
    "created",
    "channel",
    async ({ ctx, parsedInput }: { ctx: AuthenticatedActionClientCtx; parsedInput: Record<string, any> }) => {
      const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);
      await checkAuthorizationUpdated({
        userId: ctx.user.id,
        organizationId,
        access: [
          {
            type: "organization",
            roles: ["owner", "manager"],
          },
        ],
      });

      ctx.auditLoggingCtx.organizationId = organizationId;

      const result = await createChannel(parsedInput.environmentId, parsedInput.channelData);
      ctx.auditLoggingCtx.newObject = parsedInput.channelData;
      return result;
    }
  )
);

const ZUpdateChannelAction = z.object({
  channelId: ZId,
  channelData: ZChannelUpdateInput,
});

export const updateChannelAction = authenticatedActionClient.schema(ZUpdateChannelAction).action(
  withAuditLogging(
    "updated",
    "channel",
    async ({ ctx, parsedInput }: { ctx: AuthenticatedActionClientCtx; parsedInput: Record<string, any> }) => {
      const organizationId = await getOrganizationIdFromChannelId(parsedInput.channelId);
      await checkAuthorizationUpdated({
        userId: ctx.user.id,
        organizationId,
        access: [
          {
            type: "organization",
            roles: ["owner", "manager"],
          },
        ],
      });

      ctx.auditLoggingCtx.organizationId = organizationId;
      ctx.auditLoggingCtx.newObject = parsedInput.channelData;
      return await updateChannel(parsedInput.channelId, parsedInput.channelData);
    }
  )
);

const ZDeleteChannelAction = z.object({
  channelId: ZId,
});

export const deleteChannelAction = authenticatedActionClient.schema(ZDeleteChannelAction).action(
  withAuditLogging(
    "deleted",
    "channel",
    async ({ ctx, parsedInput }: { ctx: AuthenticatedActionClientCtx; parsedInput: Record<string, any> }) => {
      const organizationId = await getOrganizationIdFromChannelId(parsedInput.channelId);
      await checkAuthorizationUpdated({
        userId: ctx.user.id,
        organizationId,
        access: [
          {
            type: "organization",
            roles: ["owner", "manager"],
          },
        ],
      });

      ctx.auditLoggingCtx.organizationId = organizationId;

      const result = await deleteChannel(parsedInput.channelId);
      ctx.auditLoggingCtx.oldObject = result;
      return result;
    }
  )
);
