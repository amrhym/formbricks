import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { generateJSON, isAIConfigured } from "./client";

interface TaggingResult {
  tags: string[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  sentimentScore: number;
}

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
}: AutoTagInput): Promise<TaggingResult> => {
  if (!isAIConfigured()) {
    return { tags: [], sentiment: "neutral", sentimentScore: 0 };
  }

  const responseContext = questions
    .map((q) => {
      const answer = responseData[q.id];
      if (answer === undefined || answer === null) return null;
      const questionText = q.headline?.default || Object.values(q.headline)[0] || q.id;
      return `Q: ${questionText}\nA: ${answer}`;
    })
    .filter(Boolean)
    .join("\n\n");

  if (!responseContext.trim()) {
    return { tags: [], sentiment: "neutral", sentimentScore: 0 };
  }

  const existingTags = await prisma.tag.findMany({
    where: { environmentId },
    select: { name: true },
  });
  const existingTagNames = existingTags.map((t) => t.name);

  try {
    const result = await generateJSON<TaggingResult>(
      `You are a customer feedback analyst. Analyze survey responses and return JSON with:
- "tags": array of up to 5 short category tags (1-3 words, lowercase)
- "sentiment": one of "positive", "negative", "neutral", "mixed"
- "sentimentScore": number from -1 (very negative) to 1 (very positive)`,
      `Survey: "${surveyName}"

${responseContext}

${existingTagNames.length > 0 ? `Existing tags (prefer reusing): ${existingTagNames.join(", ")}` : ""}

Return JSON only.`
    );

    return {
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 5) : [],
      sentiment: result.sentiment || "neutral",
      sentimentScore: typeof result.sentimentScore === "number" ? result.sentimentScore : 0,
    };
  } catch (error) {
    logger.error({ error }, "AI auto-tagging failed");
    return { tags: [], sentiment: "neutral", sentimentScore: 0 };
  }
};

export const applyAutoTags = async (
  responseId: string,
  environmentId: string,
  tagNames: string[]
): Promise<void> => {
  if (tagNames.length === 0) return;

  for (const tagName of tagNames) {
    try {
      const tag = await prisma.tag.upsert({
        where: { environmentId_name: { environmentId, name: tagName } },
        create: { name: tagName, environmentId },
        update: {},
      });

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
