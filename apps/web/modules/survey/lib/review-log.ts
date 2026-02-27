import "server-only";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";

type ReviewAction = "SUBMITTED" | "APPROVED" | "REJECTED" | "RESUBMITTED";

/**
 * Create a SurveyReviewLog entry to track approval workflow actions.
 */
export const createReviewLog = async (
  surveyId: string,
  userId: string,
  action: ReviewAction,
  comment?: string
) => {
  const log = await prisma.surveyReviewLog.create({
    data: {
      surveyId,
      userId,
      action,
      comment: comment ?? null,
    },
  });

  logger.info({ surveyId, userId, action }, "Survey review log created");

  return log;
};

/**
 * Get all review logs for a survey, ordered by creation date descending.
 */
export const getReviewLogs = async (surveyId: string) => {
  return prisma.surveyReviewLog.findMany({
    where: { surveyId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};
