import "server-only";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { sendCampaign } from "./send-campaign";

export async function processScheduledCampaigns(): Promise<number> {
  const now = new Date();

  const scheduledCampaigns = await prisma.campaign.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: now },
    },
    select: { id: true },
  });

  let processed = 0;

  for (const campaign of scheduledCampaigns) {
    try {
      await sendCampaign(campaign.id);
      processed++;
    } catch (error) {
      logger.error(
        { campaignId: campaign.id, error: error instanceof Error ? error.message : String(error) },
        "Failed to process scheduled campaign"
      );
    }
  }

  return processed;
}
