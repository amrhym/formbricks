import "server-only";
import { prisma } from "@hivecfm/database";

export interface TEnvironmentSurveyMetrics {
  surveyStatusCounts: {
    draft: number;
    inProgress: number;
    completed: number;
    paused: number;
    underReview: number;
    total: number;
  };
  responsesThisMonth: number;
  responsesLastMonth: number;
  responsesTrend: number;
  averageResponseRate: number;
  averageCompletionRate: number;
  dailyResponses: { date: string; count: number }[];
}

/**
 * Aggregate survey metrics for an environment.
 */
export const getEnvironmentSurveyMetrics = async (
  environmentId: string
): Promise<TEnvironmentSurveyMetrics> => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch survey counts by status
  const surveys = await prisma.survey.findMany({
    where: { environmentId },
    select: { id: true, status: true },
  });

  const statusCounts = {
    draft: 0,
    inProgress: 0,
    completed: 0,
    paused: 0,
    underReview: 0,
    total: surveys.length,
  };

  for (const survey of surveys) {
    switch (survey.status) {
      case "draft":
        statusCounts.draft++;
        break;
      case "inProgress":
        statusCounts.inProgress++;
        break;
      case "completed":
        statusCounts.completed++;
        break;
      case "paused":
        statusCounts.paused++;
        break;
      case "underReview":
        statusCounts.underReview++;
        break;
    }
  }

  const surveyIds = surveys.map((s) => s.id);

  if (surveyIds.length === 0) {
    return {
      surveyStatusCounts: statusCounts,
      responsesThisMonth: 0,
      responsesLastMonth: 0,
      responsesTrend: 0,
      averageResponseRate: 0,
      averageCompletionRate: 0,
      dailyResponses: [],
    };
  }

  // Response counts for this month and last month
  const [responsesThisMonth, responsesLastMonth] = await Promise.all([
    prisma.response.count({
      where: {
        surveyId: { in: surveyIds },
        createdAt: { gte: startOfThisMonth },
      },
    }),
    prisma.response.count({
      where: {
        surveyId: { in: surveyIds },
        createdAt: { gte: startOfLastMonth, lt: startOfThisMonth },
      },
    }),
  ]);

  const responsesTrend =
    responsesLastMonth > 0
      ? Math.round(((responsesThisMonth - responsesLastMonth) / responsesLastMonth) * 100)
      : 0;

  // Response rate: responses (with a display) / total displays (impressions)
  // Only count responses that have an associated display to avoid >100% rates.
  // Responses without a display (e.g. via API or link surveys) are excluded.
  const [responsesWithDisplay, totalDisplays, totalResponses] = await Promise.all([
    prisma.response.count({
      where: { surveyId: { in: surveyIds }, displayId: { not: null } },
    }),
    prisma.display.count({
      where: { surveyId: { in: surveyIds } },
    }),
    prisma.response.count({
      where: { surveyId: { in: surveyIds } },
    }),
  ]);

  const averageResponseRate =
    totalDisplays > 0 ? Math.round((responsesWithDisplay / totalDisplays) * 100) : 0;

  // Completion rate: finished / total responses
  const finishedResponses = await prisma.response.count({
    where: {
      surveyId: { in: surveyIds },
      finished: true,
    },
  });

  const averageCompletionRate =
    totalResponses > 0 ? Math.round((finishedResponses / totalResponses) * 100) : 0;

  // Daily responses for the last 30 days
  const dailyResponsesRaw = await prisma.response.groupBy({
    by: ["createdAt"],
    where: {
      surveyId: { in: surveyIds },
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: true,
  });

  // Build daily buckets
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    dailyMap.set(date.toISOString().slice(0, 10), 0);
  }

  for (const row of dailyResponsesRaw) {
    const dateKey = row.createdAt.toISOString().slice(0, 10);
    const existing = dailyMap.get(dateKey) ?? 0;
    dailyMap.set(dateKey, existing + row._count);
  }

  const dailyResponses = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

  return {
    surveyStatusCounts: statusCounts,
    responsesThisMonth,
    responsesLastMonth,
    responsesTrend,
    averageResponseRate,
    averageCompletionRate,
    dailyResponses,
  };
};
