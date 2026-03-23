import { logger } from "@hivecfm/logger";

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "";
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY || "";
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-06-01";

export const isAIConfigured = () => !!AZURE_OPENAI_ENDPOINT && !!AZURE_OPENAI_KEY;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: {
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }[];
}

/**
 * Call Azure OpenAI Chat Completions API.
 */
const chatCompletion = async (
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> => {
  if (!isAIConfigured()) {
    throw new Error("AI not configured: AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY are required");
  }

  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_OPENAI_KEY,
    },
    body: JSON.stringify({
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, error: errorText }, "Azure OpenAI API error");
    throw new Error(`Azure OpenAI API error: ${response.status}`);
  }

  const data: ChatCompletionResponse = await response.json();
  return data.choices[0]?.message?.content || "";
};

/**
 * Generate a plain text response from the AI.
 */
export const generateText = async (
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> => {
  return chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    options
  );
};

/**
 * Extract a JSON object or array from a string that may contain surrounding text.
 */
const extractJSON = (text: string): string => {
  let cleaned = text.trim();

  cleaned = cleaned
    .replace(/^```(?:json)?\s*\n?/g, "")
    .replace(/\n?\s*```$/g, "")
    .trim();

  if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
    return cleaned;
  }

  const objStart = cleaned.indexOf("{");
  const arrStart = cleaned.indexOf("[");
  let start: number;

  if (objStart === -1 && arrStart === -1) {
    return cleaned;
  } else if (objStart === -1) {
    start = arrStart;
  } else if (arrStart === -1) {
    start = objStart;
  } else {
    start = Math.min(objStart, arrStart);
  }

  const isArray = cleaned[start] === "[";
  const closeChar = isArray ? "]" : "}";
  const lastClose = cleaned.lastIndexOf(closeChar);

  if (lastClose > start) {
    return cleaned.substring(start, lastClose + 1);
  }

  return cleaned.substring(start);
};

/**
 * Generate a structured JSON response from the AI.
 */
export const generateJSON = async <T>(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> => {
  const content = await chatCompletion(
    [
      {
        role: "system",
        content:
          systemPrompt +
          "\n\nYou MUST respond with valid JSON only. No markdown, no code fences, no explanation.",
      },
      { role: "user", content: userPrompt },
    ],
    options
  );

  const jsonStr = extractJSON(content);

  try {
    return JSON.parse(jsonStr) as T;
  } catch (e: any) {
    logger.error({ raw: content.substring(0, 500) }, "Failed to parse AI JSON response");
    throw new Error("AI returned an invalid response. Please try again.");
  }
};
