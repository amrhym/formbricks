import { logger } from "@hivecfm/logger";

const KIMI_API_KEY = process.env.KIMI_API_KEY || "";
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || "https://api.kimi.com/coding/v1";
const KIMI_MODEL = process.env.KIMI_MODEL || "kimi-for-coding";

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
}

/**
 * Call Kimi Code API (OpenAI-compatible with required User-Agent header).
 */
const chatCompletion = async (
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> => {
  if (!isAIConfigured()) {
    throw new Error("AI not configured: KIMI_API_KEY is not set");
  }

  const response = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KIMI_API_KEY}`,
      "User-Agent": "claude-code/1.0.0",
    },
    body: JSON.stringify({
      model: KIMI_MODEL,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, error: errorText }, "Kimi API error");
    throw new Error(`Kimi API error: ${response.status}`);
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

  const cleaned = content
    .replace(/^```(?:json)?\n?/g, "")
    .replace(/\n?```$/g, "")
    .trim();
  return JSON.parse(cleaned) as T;
};
