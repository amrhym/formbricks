import { generateObject } from "ai";
import { z } from "zod";
import { logger } from "@hivecfm/logger";
import { getModel, isAIConfigured } from "./client";

const ChoiceSchema = z.object({
  id: z.string(),
  label: z.record(z.string()).describe("i18n label, must have 'default' key"),
});

const ElementSchema = z.object({
  id: z.string(),
  type: z
    .enum([
      "openText",
      "multipleChoiceSingle",
      "multipleChoiceMulti",
      "nps",
      "rating",
      "cta",
      "consent",
      "date",
    ])
    .describe("Question type"),
  headline: z.record(z.string()).describe("i18n headline, must have 'default' key"),
  subheader: z.record(z.string()).optional().describe("Optional subheader"),
  required: z.boolean(),
  choices: z.array(ChoiceSchema).optional().describe("Choices for multiple choice questions"),
  range: z.number().optional().describe("Rating range (3, 5, 7, or 10)"),
  scale: z.enum(["number", "star", "smiley"]).optional().describe("Rating scale display"),
  placeholder: z.record(z.string()).optional().describe("Placeholder for open text"),
  longResponse: z.boolean().optional().describe("Long text response for openText"),
});

const SurveySchema = z.object({
  name: z.string().describe("Survey name"),
  blocks: z
    .array(
      z.object({
        name: z.string(),
        elements: z.array(ElementSchema),
      })
    )
    .describe("Survey blocks with questions"),
  welcomeHeadline: z.string().describe("Welcome card headline"),
  welcomeSubheader: z.string().optional().describe("Welcome card description"),
  endingHeadline: z.string().describe("Thank you message"),
  endingSubheader: z.string().optional().describe("Thank you description"),
});

interface GenerateSurveyInput {
  description: string;
  industry?: string;
  language?: string;
  maxQuestions?: number;
}

export const generateSurveyFromDescription = async ({
  description,
  industry,
  language = "en",
  maxQuestions = 10,
}: GenerateSurveyInput) => {
  if (!isAIConfigured()) {
    throw new Error("AI is not configured");
  }

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: SurveySchema,
      prompt: `You are a survey design expert. Create a professional survey based on this description:

"${description}"

${industry ? `Industry: ${industry}` : ""}
Language: ${language}
Max questions: ${maxQuestions}

Rules:
- Generate unique IDs using random 8-char strings for each element and block
- Use 'default' as the language key for all i18n strings
- Include a mix of question types (rating, NPS, multiple choice, open text)
- Start with easy questions, end with open text for detailed feedback
- NPS should ask "How likely are you to recommend..." (0-10 scale, built-in)
- Rating questions need a 'range' (3, 5, 7, or 10) and 'scale' (number, star, smiley)
- Multiple choice needs 'choices' array with id and label
- Make questions clear, concise, and unbiased
- Group related questions in the same block
- Add a "none of the above" or "other" option for multiple choice when appropriate
- Keep it professional and actionable`,
    });

    return object;
  } catch (error) {
    logger.error({ error }, "AI survey generation failed");
    throw new Error("Failed to generate survey");
  }
};
