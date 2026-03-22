import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { getModel, isAIConfigured } from "./client";

const TaggingResultSchema = z.object({
  tags: z.array(z.string()).max(5).describe("Up to 5 relevant tags for the response"),
  sentiment: z.enum(["positive", "negative", "neutral", "mixed"]).describe("Overall sentiment"),
  sentimentScore: z
    .number()
    .min(-1)
    .max(1)
    .describe("Sentiment score from -1 (very negative) to 1 (very positive)"),
});

interface AutoTagInput {
  responseData: Record<string, any>;
  surveyName: string;
  questions: { id: string; type: string; headline: Record<string, string> }[];
  environmentId: string;
}

export const autoTagResponse = async ({
  responseData,
  surveyName,
  questions,
  environmentId,
}: AutoTagInput): Promise<{
  tags: string[];
  sentiment: string;
  sentimentScore: number;
}> => {
  if (!isAIConfigured()) {
    return { tags: [], sentiment: "neutral", sentimentScore: 0 };
  }

  // Build context from response data and questions
  const responseContext = questions
    .map((q) => {
      const answer = responseData[q.id];
      if (answer === undefined || answer === null) return null;
      const questionText = q.headline?.default || q.headline?.en || Object.values(q.headline)[0] || q.id;
      return `Q: ${questionText}\nA: ${answer}`;
    })
    .filter(Boolean)
    .join("\n\n");

  if (!responseContext.trim()) {
    return { tags: [], sentiment: "neutral", sentimentScore: 0 };
  }

  // Get existing tags for consistency
  const existingTags = await prisma.tag.findMany({
    where: { environmentId },
    select: { name: true },
  });
  const existingTagNames = existingTags.map((t) => t.name);

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: TaggingResultSchema,
      prompt: `You are a customer feedback analyst. Analyze the following survey response and provide:
1. Up to 5 relevant tags that categorize this feedback
2. The overall sentiment
3. A sentiment score

Survey: "${surveyName}"

${responseContext}

${existingTagNames.length > 0 ? `Existing tags in the system (prefer reusing these when relevant): ${existingTagNames.join(", ")}` : ""}

Rules:
- Tags should be short (1-3 words), lowercase, descriptive categories
- Examples: "service quality", "wait time", "staff friendliness", "product issue", "feature request"
- For numeric ratings (NPS/rating), infer sentiment from the score
- Be concise and consistent`,
    });

    return {
      tags: object.tags,
      sentiment: object.sentiment,
      sentimentScore: object.sentimentScore,
    };
  } catch (error) {
    logger.error({ error }, "AI auto-tagging failed");
    return { tags: [], sentiment: "neutral", sentimentScore: 0 };
  }
};

/**
 * Apply AI-generated tags to a response.
 * Creates tags if they don't exist, then links them to the response.
 */
export const applyAutoTags = async (
  responseId: string,
  environmentId: string,
  tagNames: string[]
): Promise<void> => {
  if (tagNames.length === 0) return;

  for (const tagName of tagNames) {
    try {
      // Upsert tag
      const tag = await prisma.tag.upsert({
        where: { environmentId_name: { environmentId, name: tagName } },
        create: { name: tagName, environmentId },
        update: {},
      });

      // Link tag to response (ignore if already exists)
      await prisma.tagsOnResponses.upsert({
        where: { responseId_tagId: { responseId, tagId: tag.id } },
        create: { responseId, tagId: tag.id },
        update: {},
      });
    } catch (error) {
      logger.error({ error, tagName, responseId }, "Failed to apply auto-tag");
    }
  }
};
