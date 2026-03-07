"use server";

import { z } from "zod";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { ZCampaignCreateInput } from "@hivecfm/types/campaign";
import { sendCampaign } from "@/lib/campaign/send-campaign";
import {
  createCampaign,
  deleteCampaign,
  getCampaignWithSends,
  getCampaignsByEnvironmentId,
} from "@/lib/campaign/service";
import { deleteWorkflow, getWorkflowStats } from "@/lib/novu/service";
import { checkAddonAccess, checkLicenseValid } from "@/lib/tenant/license-enforcement";
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
    const organizationId = await getOrganizationIdFromCampaignId(parsedInput.campaignId);

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
          projectId: await getProjectIdFromCampaignId(parsedInput.campaignId),
        },
      ],
    });

    // Check license validity and campaign addon access
    const licenseValid = await checkLicenseValid(organizationId);
    if (!licenseValid.valid) {
      throw new Error(licenseValid.reason || "License validation failed");
    }

    const hasAddonAccess = await checkAddonAccess(organizationId, "campaignManagement");
    if (!hasAddonAccess) {
      throw new Error("Campaign management addon is not enabled for this organization");
    }

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

const ZGetCampaignDetailAction = z.object({
  campaignId: z.string().cuid2(),
});

export const getCampaignDetailAction = authenticatedActionClient
  .schema(ZGetCampaignDetailAction)
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
          minPermission: "read",
          projectId: await getProjectIdFromCampaignId(parsedInput.campaignId),
        },
      ],
    });

    return await getCampaignWithSends(parsedInput.campaignId);
  });

const ZGetCampaignNovuStatsAction = z.object({
  campaignId: z.string().cuid2(),
});

export const getCampaignNovuStatsAction = authenticatedActionClient
  .schema(ZGetCampaignNovuStatsAction)
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
          minPermission: "read",
          projectId: await getProjectIdFromCampaignId(parsedInput.campaignId),
        },
      ],
    });

    const campaign = await prisma.campaign.findUnique({
      where: { id: parsedInput.campaignId },
      select: {
        novuWorkflowId: true,
        environmentId: true,
        sends: { select: { recipient: true } },
      },
    });

    if (!campaign?.novuWorkflowId) {
      return { total: 0, sent: 0, failed: 0, delivered: 0, seen: 0, read: 0, messages: [] };
    }

    // Get all Novu messages for this workflow, then filter to only this campaign's recipients
    const recipientEmails = new Set(campaign.sends.map((s) => s.recipient.toLowerCase()));
    const allStats = await getWorkflowStats(campaign.environmentId, campaign.novuWorkflowId);

    const filteredMessages = allStats.messages.filter((msg) => recipientEmails.has(msg.email.toLowerCase()));

    // Re-aggregate stats from filtered messages
    let sent = 0;
    let failed = 0;
    let delivered = 0;
    let seen = 0;
    let read = 0;
    for (const msg of filteredMessages) {
      if (msg.status === "sent") {
        sent++;
        delivered++;
      } else if (msg.status === "error" || msg.status === "failed") {
        failed++;
      }
      if (msg.seen) seen++;
      if (msg.read) read++;
    }

    return {
      total: filteredMessages.length,
      sent,
      failed,
      delivered,
      seen,
      read,
      messages: filteredMessages,
    };
  });
