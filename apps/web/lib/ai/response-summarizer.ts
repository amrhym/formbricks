import { generateText } from "ai";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { getModel, isAIConfigured } from "./client";

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

  // Build response summaries
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
    const { text } = await generateText({
      model: getModel(),
      prompt: `You are a customer experience analyst. Analyze these ${recentResponses.length} survey responses and provide a concise executive summary.

Survey: "${surveyName}"
Period: ${dateFrom?.toISOString().split("T")[0] || "all time"} to ${dateTo?.toISOString().split("T")[0] || "now"}

${responseTexts.join("\n\n")}

Provide a structured summary with:
1. **Overview**: 2-3 sentence summary of overall findings
2. **Key Metrics**: Average scores, response rate trends
3. **Top Themes**: Most common topics/issues (positive and negative)
4. **Actionable Insights**: 3-5 specific recommendations
5. **Alerts**: Any urgent issues that need immediate attention

Keep it concise and actionable. Use bullet points. No fluff.`,
      maxTokens: 2000,
    });

    return {
      summary: text,
      generatedAt: new Date(),
      responseCount: recentResponses.length,
      surveyId,
    };
  } catch (error) {
    logger.error({ error, surveyId }, "AI survey insights generation failed");
    return null;
  }
};
