import "server-only";
import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import type { TCampaignCreateInput, TCampaignWithRelations } from "@hivecfm/types/campaign";
import { ZCampaignCreateInput } from "@hivecfm/types/campaign";
import { ZId } from "@hivecfm/types/common";
import { DatabaseError, InvalidInputError, ResourceNotFoundError } from "@hivecfm/types/errors";
import { validateInputs } from "../utils/validate";

const selectCampaign = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  status: true,
  subject: true,
  surveyId: true,
  segmentId: true,
  providerType: true,
  novuWorkflowId: true,
  scheduledAt: true,
  environmentId: true,
  sentAt: true,
  sentCount: true,
  failedCount: true,
  totalCount: true,
  survey: {
    select: { id: true, name: true },
  },
  segment: {
    select: { id: true, title: true },
  },
} satisfies Prisma.CampaignSelect;

export const getCampaign = reactCache(async (campaignId: string): Promise<TCampaignWithRelations> => {
  validateInputs([campaignId, ZId]);

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: selectCampaign,
    });

    if (!campaign) {
      throw new ResourceNotFoundError("Campaign", campaignId);
    }

    return campaign as TCampaignWithRelations;
  } catch (error) {
    if (error instanceof ResourceNotFoundError) throw error;
    throw new DatabaseError(`Database error when fetching campaign ${campaignId}`);
  }
});

export const getCampaignsByEnvironmentId = reactCache(
  async (environmentId: string): Promise<TCampaignWithRelations[]> => {
    validateInputs([environmentId, ZId]);

    try {
      const campaigns = await prisma.campaign.findMany({
        where: { environmentId },
        select: selectCampaign,
        orderBy: { createdAt: "desc" },
      });

      return campaigns as TCampaignWithRelations[];
    } catch (error) {
      throw new DatabaseError(`Database error when fetching campaigns for environment ${environmentId}`);
    }
  }
);

export const createCampaign = async (
  environmentId: string,
  campaignInput: TCampaignCreateInput
): Promise<TCampaignWithRelations> => {
  validateInputs([environmentId, ZId], [campaignInput, ZCampaignCreateInput]);

  try {
    const survey = await prisma.survey.findUnique({
      where: { id: campaignInput.surveyId },
      select: { name: true },
    });
    const subject = survey?.name || campaignInput.name;

    const campaign = await prisma.campaign.create({
      data: {
        name: campaignInput.name,
        subject,
        surveyId: campaignInput.surveyId,
        segmentId: campaignInput.segmentId,
        providerType: campaignInput.providerType || "email",
        scheduledAt: campaignInput.scheduledAt || null,
        environmentId,
      },
      select: selectCampaign,
    });

    return campaign as TCampaignWithRelations;
  } catch (error) {
    logger.error(error, "Error creating campaign");
    throw new DatabaseError("Database error when creating campaign");
  }
};

export const deleteCampaign = async (campaignId: string): Promise<TCampaignWithRelations> => {
  validateInputs([campaignId, ZId]);

  try {
    const existing = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });

    if (!existing) {
      throw new ResourceNotFoundError("Campaign", campaignId);
    }

    if (!["draft", "scheduled"].includes(existing.status)) {
      throw new InvalidInputError("Only draft and scheduled campaigns can be deleted");
    }

    const campaign = await prisma.campaign.delete({
      where: { id: campaignId },
      select: selectCampaign,
    });

    return campaign as TCampaignWithRelations;
  } catch (error) {
    if (error instanceof ResourceNotFoundError || error instanceof InvalidInputError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new ResourceNotFoundError("Campaign", campaignId);
      }
    }
    logger.error(error, "Error deleting campaign");
    throw new DatabaseError(`Database error when deleting campaign ${campaignId}`);
  }
};
