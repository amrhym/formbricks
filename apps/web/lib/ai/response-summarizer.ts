import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { generateText, isAIConfigured } from "./client";

interface SummarizeInput {
  surveyId: string;
  surveyName: string;
  questions: { id: string; type: string; headline: Record<string, string> }[];
  dateFrom?: Date;
  dateTo?: Date;
  maxResponses?: number;
}

export interface SurveyInsightsSummary {
  summary: string;
  generatedAt: Date;
  responseCount: number;
  surveyId: string;
}

export const generateSurveyInsights = async ({
  surveyId,
  surveyName,
  questions,
  dateFrom,
  dateTo,
  maxResponses = 100,
}: SummarizeInput): Promise<SurveyInsightsSummary | null> => {
  if (!isAIConfigured()) return null;

  const where: any = { surveyId, finished: true };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  const recentResponses = await prisma.response.findMany({
    where,
    select: { data: true, createdAt: true, language: true },
    orderBy: { createdAt: "desc" },
    take: maxResponses,
  });

  if (recentResponses.length === 0) return null;

  const responseTexts = recentResponses.map((r, idx) => {
    const data = r.data as Record<string, any>;
    const answers = questions
      .map((q) => {
        const answer = data[q.id];
        if (answer === undefined || answer === null) return null;
        const qText = q.headline?.default || Object.values(q.headline)[0] || q.id;
        return `  ${qText}: ${answer}`;
      })
      .filter(Boolean)
      .join("\n");
    return `Response #${idx + 1} (${r.createdAt.toISOString().split("T")[0]}):\n${answers}`;
  });

  try {
    const summary = await generateText(
      "You are a customer experience analyst. Provide concise, actionable executive summaries.",
      `Analyze these ${recentResponses.length} survey responses for "${surveyName}".

${responseTexts.join("\n\n")}

Provide a structured summary with:
1. **Overview**: 2-3 sentence summary
2. **Key Metrics**: Average scores, trends
3. **Top Themes**: Most common topics (positive and negative)
4. **Actionable Insights**: 3-5 recommendations
5. **Alerts**: Urgent issues needing attention

Keep it concise. Use bullet points.`,
      { maxTokens: 2000 }
    );

    return {
      summary,
      generatedAt: new Date(),
      responseCount: recentResponses.length,
      surveyId,
    };
  } catch (error) {
    logger.error({ error, surveyId }, "AI survey insights generation failed");
    return null;
  }
};
