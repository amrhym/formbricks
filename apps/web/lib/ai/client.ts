import { logger } from "@hivecfm/logger";

const KIMI_API_KEY = process.env.KIMI_API_KEY || "";
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1";
const KIMI_MODEL = process.env.KIMI_MODEL || "moonshot-v1-32k";

export const isAIConfigured = () => !!KIMI_API_KEY;

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
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Call Kimi (Moonshot) API using OpenAI-compatible chat completions endpoint.
 */
export const chatCompletion = async (
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; responseFormat?: "json_object" | "text" }
): Promise<string> => {
  if (!isAIConfigured()) {
    throw new Error("AI not configured: KIMI_API_KEY is not set");
  }

  const body: Record<string, any> = {
    model: KIMI_MODEL,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 2000,
  };

  if (options?.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KIMI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, error: errorText }, "Kimi API error");
    throw new Error(`Kimi API error: ${response.status} - ${errorText}`);
  }

  const data: ChatCompletionResponse = await response.json();
  return data.choices[0]?.message?.content || "";
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
        content: systemPrompt + "\n\nYou MUST respond with valid JSON only. No markdown, no code fences.",
      },
      { role: "user", content: userPrompt },
    ],
    { ...options, responseFormat: "json_object" }
  );

  // Strip markdown code fences if present
  const cleaned = content
    .replace(/^```(?:json)?\n?/g, "")
    .replace(/\n?```$/g, "")
    .trim();
  return JSON.parse(cleaned) as T;
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
