"use server";

import { z } from "zod";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { ZCampaignCreateInput } from "@hivecfm/types/campaign";
import { sendCampaign } from "@/lib/campaign/send-campaign";
import { createCampaign, deleteCampaign, getCampaignsByEnvironmentId } from "@/lib/campaign/service";
import { deleteWorkflow } from "@/lib/novu/service";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import {
  getOrganizationIdFromCampaignId,
  getOrganizationIdFromEnvironmentId,
  getProjectIdFromCampaignId,
  getProjectIdFromEnvironmentId,
} from "@/lib/utils/helper";

const ZCreateCampaignAction = z.object({
  environmentId: z.string().cuid2(),
  data: ZCampaignCreateInput,
});

export const createCampaignAction = authenticatedActionClient
  .schema(ZCreateCampaignAction)
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
          minPermission: "readWrite",
          projectId: await getProjectIdFromEnvironmentId(parsedInput.environmentId),
        },
      ],
    });

    return await createCampaign(parsedInput.environmentId, parsedInput.data);
  });

const ZSendCampaignAction = z.object({
  campaignId: z.string().cuid2(),
  scheduledAt: z.coerce.date().optional().nullable(),
});

export const sendCampaignAction = authenticatedActionClient
  .schema(ZSendCampaignAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromCampaignId(parsedInput.campaignId),
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          minPermission: "readWrite",
          projectId: await getProjectIdFromCampaignId(parsedInput.campaignId),
        },
      ],
    });

    if (parsedInput.scheduledAt) {
      await prisma.campaign.update({
        where: { id: parsedInput.campaignId },
        data: { status: "scheduled", scheduledAt: parsedInput.scheduledAt },
      });
      return { success: true, scheduled: true };
    }

    await sendCampaign(parsedInput.campaignId);
    return { success: true };
  });

const ZDeleteCampaignAction = z.object({
  campaignId: z.string().cuid2(),
});

export const deleteCampaignAction = authenticatedActionClient
  .schema(ZDeleteCampaignAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromCampaignId(parsedInput.campaignId),
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          minPermission: "readWrite",
          projectId: await getProjectIdFromCampaignId(parsedInput.campaignId),
        },
      ],
    });

    const campaign = await prisma.campaign.findUnique({
      where: { id: parsedInput.campaignId },
      select: { novuWorkflowId: true, environmentId: true },
    });

    if (campaign?.novuWorkflowId) {
      try {
        await deleteWorkflow(campaign.environmentId, campaign.novuWorkflowId);
      } catch (error) {
        // Best-effort cleanup, don't fail the delete
        logger.warn({ error }, "Failed to delete Novu workflow during campaign deletion");
      }
    }

    return await deleteCampaign(parsedInput.campaignId);
  });

const ZGetCampaignsAction = z.object({
  environmentId: z.string().cuid2(),
});

export const getCampaignsAction = authenticatedActionClient
  .schema(ZGetCampaignsAction)
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

    return await getCampaignsByEnvironmentId(parsedInput.environmentId);
  });
