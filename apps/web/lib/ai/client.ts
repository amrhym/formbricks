import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";

interface LlmConfig {
  provider: "azureOpenAI" | "openAI";
  apiKey: string;
  endpointUrl?: string;
  deploymentName?: string;
  apiVersion?: string;
  model?: string;
}

let cachedConfig: LlmConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Load LLM config from integration table, fallback to env vars.
 */
async function getLlmConfig(): Promise<LlmConfig | null> {
  if (cachedConfig && Date.now() - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    // Try loading from any environment's LLM integration
    const integration = await prisma.integration.findFirst({
      where: { type: "llm" },
      select: { config: true },
    });

    if (integration?.config) {
      const key = (integration.config as any)?.key;
      if (key?.apiKey) {
        cachedConfig = key as LlmConfig;
        cacheTime = Date.now();
        return cachedConfig;
      }
    }
  } catch {
    // DB not available, fall through to env vars
  }

  // Fallback to env vars
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_KEY;
  if (endpoint && apiKey) {
    cachedConfig = {
      provider: "azureOpenAI",
      apiKey,
      endpointUrl: endpoint,
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini",
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-06-01",
    };
    cacheTime = Date.now();
    return cachedConfig;
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    cachedConfig = {
      provider: "openAI",
      apiKey: openaiKey,
      model: "gpt-4o-mini",
    };
    cacheTime = Date.now();
    return cachedConfig;
  }

  return null;
}

export const isAIConfigured = async (): Promise<boolean> => {
  const config = await getLlmConfig();
  return config !== null;
};

// Sync version for quick checks (uses cache only)
export const isAIConfiguredSync = (): boolean => {
  if (cachedConfig) return true;
  // Check env vars as fallback
  return (
    !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_KEY) || !!process.env.OPENAI_API_KEY
  );
};

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
 * Call LLM Chat Completions API (Azure OpenAI or OpenAI).
 */
const chatCompletion = async (
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> => {
  const config = await getLlmConfig();
  if (!config) {
    throw new Error("AI not configured. Set up LLM integration or AZURE_OPENAI_ENDPOINT env vars.");
  }

  let url: string;
  let headers: Record<string, string>;

  if (config.provider === "azureOpenAI") {
    url = `${config.endpointUrl}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion || "2024-06-01"}`;
    headers = { "Content-Type": "application/json", "api-key": config.apiKey };
  } else {
    url = "https://api.openai.com/v1/chat/completions";
    headers = { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` };
  }

  const body: any = {
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 4096,
  };

  if (config.provider === "openAI") {
    body.model = config.model || "gpt-4o-mini";
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, error: errorText }, "LLM API error");
    throw new Error(`LLM API error: ${response.status}`);
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
