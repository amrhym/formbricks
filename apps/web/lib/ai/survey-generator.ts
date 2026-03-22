import { logger } from "@hivecfm/logger";
import { generateJSON, isAIConfigured } from "./client";

interface GeneratedSurvey {
  name: string;
  blocks: {
    name: string;
    elements: {
      id: string;
      type: string;
      headline: Record<string, string>;
      subheader?: Record<string, string>;
      required: boolean;
      choices?: { id: string; label: Record<string, string> }[];
      range?: number;
      scale?: string;
      placeholder?: Record<string, string>;
      longResponse?: boolean;
    }[];
  }[];
  welcomeHeadline: string;
  welcomeSubheader?: string;
  endingHeadline: string;
  endingSubheader?: string;
}

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
}: GenerateSurveyInput): Promise<GeneratedSurvey> => {
  if (!isAIConfigured()) {
    throw new Error("AI is not configured");
  }

  try {
    const result = await generateJSON<GeneratedSurvey>(
      `You are a survey design expert. Create professional surveys. Return JSON with:
- "name": survey name
- "blocks": array of blocks, each with "name" and "elements" array
- "welcomeHeadline", "welcomeSubheader", "endingHeadline", "endingSubheader"

Each element must have:
- "id": unique 8-char random string
- "type": one of "openText", "multipleChoiceSingle", "multipleChoiceMulti", "nps", "rating", "cta", "consent", "date"
- "headline": { "default": "question text" }
- "required": boolean
- For rating: add "range" (3,5,7,10) and "scale" ("number","star","smiley")
- For multiple choice: add "choices" array with { "id": "random", "label": { "default": "text" } }
- For openText: optionally add "longResponse": true`,
      `Create a survey: "${description}"
${industry ? `Industry: ${industry}` : ""}
Language: ${language}
Max questions: ${maxQuestions}

Mix question types. Start easy, end with open text. Return JSON only.`,
      { maxTokens: 3000 }
    );

    return result;
  } catch (error) {
    logger.error({ error }, "AI survey generation failed");
    throw new Error("Failed to generate survey");
  }
};
