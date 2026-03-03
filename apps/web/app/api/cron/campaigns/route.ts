import { headers } from "next/headers";
import { logger } from "@hivecfm/logger";
import { responses } from "@/app/lib/api/response";
import { processScheduledCampaigns } from "@/lib/campaign/campaign-scheduler";
import { CRON_SECRET } from "@/lib/constants";

export const GET = async () => {
  const requestHeaders = await headers();
  if (requestHeaders.get("x-api-key") !== CRON_SECRET) {
    return responses.notAuthenticatedResponse();
  }

  try {
    const count = await processScheduledCampaigns();
    logger.info({ count }, "Processed scheduled campaigns");
    return Response.json({ success: true, processed: count });
  } catch (error) {
    logger.error(error, "Failed to process scheduled campaigns");
    return Response.json({ success: false, error: "Internal error" }, { status: 500 });
  }
};
